import express, { json } from 'express'
import {AutoScalingClient, SetDesiredCapacityCommand, DescribeAutoScalingInstancesCommand, TerminateInstanceInAutoScalingGroupCommand} from "@aws-sdk/client-auto-scaling"
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2'
import cors from 'cors'
import 'dotenv/config'

const app = express()
app.use(json())
app.use(cors())

const client = new AutoScalingClient({region:"us-east-2", credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_ACCESS_SECRET!
}})

const ec2Client = new EC2Client({region:"us-east-2", credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_ACCESS_SECRET!
}})

type Machine = {
    instanceId: string,
    ip: string,
    isUsed: boolean,
    assignedProject?: string,
    assignedAt?: number
}

const ALL_MACHINES: Machine[] = []
const PENDING_HEALTH_CHECK = new Set<string>() // instanceIds currently being health-checked
const DESIRED_IDLE_BUFFER = 1
const MAX_MACHINE_AGE_MS = 30 * 60 * 1000 // 30 minutes

async function isHealthy(ip: string): Promise<boolean> {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000)
        await fetch(`http://${ip}:3001/`, { signal: controller.signal })
        clearTimeout(timeout)
        return true
    } catch {
        return false
    }
}

async function waitUntilHealthy(instanceId: string, ip: string) {
    const maxWaitMs = 5 * 60 * 1000 // give up after 5 minutes
    const intervalMs = 10 * 1000
    const start = Date.now()

    console.log(`Health-checking machine ${instanceId} (${ip})...`)

    while (Date.now() - start < maxWaitMs) {
        if (await isHealthy(ip)) {
            PENDING_HEALTH_CHECK.delete(instanceId)
            ALL_MACHINES.push({ instanceId, ip, isUsed: false })
            console.log(`Machine ${instanceId} (${ip}) is ready, added to pool`)
            ensureCapacity().catch(console.error)
            return
        }
        await new Promise(r => setTimeout(r, intervalMs))
    }

    console.log(`Machine ${instanceId} never became healthy after 5min, skipping`)
    PENDING_HEALTH_CHECK.delete(instanceId)
}

async function terminateMachine(instanceId: string) {
    const command = new TerminateInstanceInAutoScalingGroupCommand({
        InstanceId: instanceId,
        ShouldDecrementDesiredCapacity: true
    })
    await client.send(command)
    const idx = ALL_MACHINES.findIndex(m => m.instanceId === instanceId)
    if (idx !== -1) ALL_MACHINES.splice(idx, 1)
    console.log(`Auto-terminated machine: ${instanceId}`)
}

async function refreshInstances() {
    const command = new DescribeAutoScalingInstancesCommand();
    const data = await client.send(command)

    const instanceIds = data.AutoScalingInstances
        ?.map(x => x.InstanceId)
        .filter((id): id is string => id !== undefined) ?? []

    if (instanceIds.length === 0) {
        ALL_MACHINES.length = 0
        PENDING_HEALTH_CHECK.clear()
        return
    }

    const ec2InstanceCommand = new DescribeInstancesCommand({
        InstanceIds: instanceIds
    })
    const ec2Response = await ec2Client.send(ec2InstanceCommand)

    const liveInstances = ec2Response.Reservations
        ?.flatMap(r => r.Instances ?? [])
        .filter(i => i.State?.Name === "running" || i.State?.Name === "pending") ?? []

    const liveIds = new Set(liveInstances.map(i => i.InstanceId))

    // Remove dead machines from pool
    for (let i = ALL_MACHINES.length - 1; i >= 0; i--) {
        if (!liveIds.has(ALL_MACHINES[i]!.instanceId)) {
            console.log(`Removing dead machine: ${ALL_MACHINES[i]!.instanceId}`)
            ALL_MACHINES.splice(i, 1)
        }
    }

    // Cancel health checks for terminated instances
    for (const pendingId of PENDING_HEALTH_CHECK) {
        if (!liveIds.has(pendingId)) {
            console.log(`Pending machine ${pendingId} terminated, removing from health-check queue`)
            PENDING_HEALTH_CHECK.delete(pendingId)
        }
    }

    // Queue health checks for newly discovered machines
    const knownIds = new Set([
        ...ALL_MACHINES.map(m => m.instanceId),
        ...PENDING_HEALTH_CHECK
    ])

    for (const instance of liveInstances) {
        const id = instance.InstanceId
        const ip = instance.PublicIpAddress

        if (!id || !ip) continue // skip if no public IP yet (still booting)
        if (knownIds.has(id)) continue

        PENDING_HEALTH_CHECK.add(id)
        waitUntilHealthy(id, ip).catch(console.error) // non-blocking
    }
}

async function ensureCapacity() {
    const idleCount = ALL_MACHINES.filter(x => !x.isUsed).length
    const pendingCount = PENDING_HEALTH_CHECK.size
    // Count pending machines toward the buffer so we don't over-provision
    const needed = Math.max(0, DESIRED_IDLE_BUFFER - idleCount - pendingCount)
    if (needed === 0) return
    const command = new SetDesiredCapacityCommand({
        AutoScalingGroupName: "vscode-asg",
        DesiredCapacity: ALL_MACHINES.length + pendingCount + needed
    })
    await client.send(command)
    console.log(`Scaling up by ${needed}`)
}

async function cleanupStaleMachines() {
    const now = Date.now()
    for (const machine of [...ALL_MACHINES]) {
        if (machine.isUsed && machine.assignedAt && (now - machine.assignedAt) > MAX_MACHINE_AGE_MS) {
            console.log(`Machine ${machine.instanceId} exceeded ${MAX_MACHINE_AGE_MS / 60000}min, terminating`)
            await terminateMachine(machine.instanceId).catch(console.error)
        }
    }
    await ensureCapacity().catch(console.error)
}

refreshInstances().then(() => ensureCapacity()).catch(console.error)

setInterval(() => {
    refreshInstances().catch(console.error)
}, 10 * 1000)

setInterval(() => {
    cleanupStaleMachines().catch(console.error)
}, 60 * 1000)

app.get("/:projectId", async (req, res) => {
    const idleMachine = ALL_MACHINES.find(x => !x.isUsed)

    if (!idleMachine) {
        const scaleUp = new SetDesiredCapacityCommand({
            AutoScalingGroupName: "vscode-asg",
            DesiredCapacity: ALL_MACHINES.length + PENDING_HEALTH_CHECK.size + 1
        })
        client.send(scaleUp).catch(err => console.error("Scale-up failed:", err))
        res.status(404).send("No idle machine found, scaling up")
        return
    }

    idleMachine.isUsed = true
    idleMachine.assignedProject = req.params.projectId
    idleMachine.assignedAt = Date.now()

    ensureCapacity().catch(err => console.error("ensureCapacity failed:", err))

    res.send({
        ip: idleMachine.ip,
        instanceId: idleMachine.instanceId
    })
})

app.post("/destroy", async (req, res) => {
    const machineId = req.body?.machineId

    if (typeof machineId !== "string" || !machineId) {
        res.status(400).send("machineId is required")
        return
    }

    try {
        await terminateMachine(machineId)
        await ensureCapacity()
        res.send({ success: true })
    } catch (err) {
        console.error(err)
        res.status(500).send("Failed to terminate")
    }
})

app.listen(3003, () => {
    console.log("Worker Orchestrator listening Port 3003")
})
