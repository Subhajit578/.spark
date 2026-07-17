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
    assignedProject?: string
}

const ALL_MACHINES: Machine[] = []
const DESIRED_IDLE_BUFFER = 0

async function refreshInstances() {
    const command = new DescribeAutoScalingInstancesCommand();
    const data = await client.send(command)

    const instanceIds = data.AutoScalingInstances
        ?.map(x => x.InstanceId)
        .filter((id): id is string => id !== undefined) ?? []

    const ec2InstanceCommand = new DescribeInstancesCommand({
        InstanceIds: instanceIds
    })
    const ec2Response = await ec2Client.send(ec2InstanceCommand)

    const liveInstances = ec2Response.Reservations
        ?.flatMap(r => r.Instances ?? [])
        .filter(i => i.State?.Name === "running" || i.State?.Name === "pending") ?? []

    const liveIds = new Set(liveInstances.map(i => i.InstanceId))

    // Remove dead machines (no longer in the live set)
    for (let i = ALL_MACHINES.length - 1; i >= 0; i--) {
        if (!liveIds.has(ALL_MACHINES[i]!.instanceId)) {
            console.log(`Removing dead machine: ${ALL_MACHINES[i]!.instanceId}`)
            ALL_MACHINES.splice(i, 1)
        }
    }

    // Add newly seen machines
    const knownIds = new Set(ALL_MACHINES.map(m => m.instanceId))
    for (const instance of liveInstances) {
        if (instance.InstanceId && !knownIds.has(instance.InstanceId)) {
            ALL_MACHINES.push({
                instanceId: instance.InstanceId,
                ip: instance.PublicIpAddress ?? "",
                isUsed: false
            })
            console.log(`Added new machine: ${instance.InstanceId}`)
        }
    }
}

async function ensureCapacity() {
    const idleCount = ALL_MACHINES.filter(x => !x.isUsed).length
    const command = new SetDesiredCapacityCommand({
        AutoScalingGroupName: "vscode-asg",
        DesiredCapacity: ALL_MACHINES.length + Math.max(0, DESIRED_IDLE_BUFFER - idleCount)
    })
    await client.send(command)
}

refreshInstances().catch(console.error)
setInterval(() => {
    refreshInstances().catch(console.error)
}, 10 * 1000)

app.get("/:projectId", async (req, res) => {
    const idleMachine = ALL_MACHINES.find(x => x.isUsed === false);

    if (!idleMachine) {
        // No idle machine right now — scale up so future requests succeed
        ensureCapacity().catch(err => console.error("Scale-up failed:", err))
        res.status(404).send("No idle machine found, scaling up");
        return;
    }

    idleMachine.isUsed = true;
    idleMachine.assignedProject = req.params.projectId;

    // Top up the buffer since we just consumed one idle machine.
    // Scaling failure doesn't invalidate the machine we already assigned,
    // so don't fail the response over it.
    ensureCapacity().catch(err => console.error("Scale-up failed:", err))

    res.send({
        ip: idleMachine.ip
    });
})

app.post("/destroy", async (req, res) => {
    const machineId = req.body?.machineId

    if (typeof machineId !== "string" || !machineId) {
        res.status(400).send("machineId is required")
        return
    }

    const command = new TerminateInstanceInAutoScalingGroupCommand({
        InstanceId: machineId,
        ShouldDecrementDesiredCapacity: true
    })

    try {
        await client.send(command)
        const idx = ALL_MACHINES.findIndex(m => m.instanceId === machineId)
        if (idx !== -1) ALL_MACHINES.splice(idx, 1)
        res.send({ success: true })
    } catch (err) {
        console.error(err)
        res.status(500).send("Failed to terminate")
    }
})

app.listen(3003, () => {
    console.log("Worker Orchestrator listening Port 3003")
})