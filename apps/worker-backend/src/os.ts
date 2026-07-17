import { prismaClient} from "@repo/db";
import ChildProcess from "node:child_process";
import fs from 'fs'
import path from 'path'

const BASE_WORKER_DIR = "/tmp/spark-worker"

if(!fs.existsSync(BASE_WORKER_DIR)) {
    fs.mkdirSync(BASE_WORKER_DIR, {recursive : true})
}

export const getProjectDir = (projectId: string) => path.join(BASE_WORKER_DIR, projectId)

export async function handleFileUpdate(filePath:string, fileContent: string, projectId: string) {
    try {
        const fullPath = path.join(getProjectDir(projectId), filePath)
        fs.mkdirSync(path.dirname(fullPath), { recursive: true })
        fs.writeFileSync(fullPath, fileContent)
        await prismaClient.actions.create({
            data : {
                projectId,
                content: `Modified Code in ${filePath}`
            }
        })
    } catch (err) {
        console.log("Error writing into the file", err)
    }
}

export async function handleShellCommand(shellCommand:string, projectId: string) {
    const commands = shellCommand.split("&&")
    const projectDir = getProjectDir(projectId)

    for (const command of commands) {
        console.log("Command ", command)
        try {
            const isDevServer = command.trim().startsWith('npm run dev') || command.trim().startsWith('npm start') || command.trim().startsWith('npx vite')
    
            if (isDevServer) {
                try { ChildProcess.execSync('npm install', { cwd: projectDir }) } catch {}
                ChildProcess.spawn(command.trim(), {
                    cwd: projectDir,
                    shell: true,
                    detached: true,
                    stdio: 'ignore'
                }).unref()
            } else {
                ChildProcess.execSync(command.trim(), { cwd: projectDir })
            }
    
            await prismaClient.actions.create({
                data: {
                    projectId,
                    content: `Ran command: ${command.trim()}`
                }
            })
        } catch(err) {
            console.log("Error executing the command", err)
        }
    }
}