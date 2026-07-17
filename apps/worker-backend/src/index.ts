import 'dotenv/config'
import Anthropic from "@anthropic-ai/sdk";
import express from 'express';
import cors from "cors";
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { BASE_PROMPT, getSystemPrompt } from './prompts';
import { basePrompt as nodeBasePrompt } from './defaults/node';
import { basePrompt as reactBasePrompt } from './defaults/react';
import { prismaClient } from '@repo/db';
import { ArtifactProcessor } from './parser';
import { handleFileUpdate, handleShellCommand, getProjectDir } from './os';
import { WORK_DIR } from './constants';
import fs from 'fs';
import path from 'path';
import ChildProcess from 'node:child_process';
const client = new Anthropic();
const app = express()
app.use(cors())
app.use(express.json())

app.post("/template", async(req,res) => {
    try {
        const prompt = req.body.prompt
        if (!process.env.ANTHROPIC_API_KEY) {
            res.status(500).json({ message: "ANTHROPIC_API_KEY is not set in backend/.env" })
            return
        }
        const response = await client.messages.create({
            messages: [{
                role: "user", content:prompt
            }],
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024, 
            system: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"
        })
        const answer = (response.content[0] as TextBlock).text.trim().toLowerCase()
        if(answer !== 'react' && answer !== 'node') {
            res.status(403).json({message: "Could not determine project template"})
            return;
        } 
        if(answer === 'node') {
            return res.json({
                prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
                uiPrompts: [nodeBasePrompt]
            })
        }
        return res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project 
                visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the 
                file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [reactBasePrompt]
        })
    } catch (err) {
        console.error("Template error:", err)
        const message = err instanceof Error ? err.message : "Failed to determine project template"
        res.status(500).json({ message })
    }
})
// async function main() {
//     await client.messages
//   .stream({
//     messages: [
//         { role: "user", 
//             content: `For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production.\n\n
//             By default, this template supports JSX syntax with Tailwind CSS classes, React hooks, and lucide React for icons. So not install other packages for UI themes, icons, 
//             etc unless absolutely necessary or I request them\n\nUse Icons from lucide-react for logos.
//             \n\nUse stock photos from unsplash where appropriate, only valid URLs you know exists. Do not download the images, only link them in image tags. \n\n`}
//     , {
//         role: "user", content: `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project
//         .\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`
//     }, 
//     {
//         role: "user", content: ""
//     }],
//     model: "claude-haiku-4-5-20251001",
//     max_tokens: 1024
//   })
//   .on("text", (text) => {
//     console.log(text);
//   });
// }
// main()
// app.post("/chat", async (req, res) => {
//     try {
//         const messages = req.body.messages
//         const response = await client.messages.create({
//             messages: messages,
//             model: "claude-haiku-4-5-20251001",
//             max_tokens: 8192,
//             system: getSystemPrompt()
//         })
//         const text = response.content
//             .filter((block): block is TextBlock => block.type === "text")
//             .map((block) => block.text)
//             .join("")
//         res.json({ text })
//     } catch (err) {
//         console.error("Chat error:", err)
//         const message = err instanceof Error ? err.message : "Failed to generate project"
//         res.status(500).json({ message })
//     }
// })

// app.post("/chat/stream", async (req, res) => {
//     const messages = req.body.messages

//     res.setHeader("Content-Type", "text/event-stream")
//     res.setHeader("Cache-Control", "no-cache")
//     res.setHeader("Connection", "keep-alive")
//     res.flushHeaders?.()

//     try {
//         const stream = client.messages.stream({
//             messages,
//             model: "claude-haiku-4-5-20251001",
//             max_tokens: 8192,
//             system: getSystemPrompt(),
//         })

//         stream.on("text", (textDelta) => {
//             res.write(`data: ${JSON.stringify({ type: "text", text: textDelta })}\n\n`)
//         })

//         await stream.done()

//         res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`)
//         res.end()
//     } catch (err) {
//         console.error("Chat stream error:", err)
//         const message = err instanceof Error ? err.message : "Failed to generate project"
//         res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
//         res.end()
//     }
// })

app.post("/v1/prompt", async (req, res) => {
    // initialize a new client Obj 
    // Add the prompt to the DB 
    // Check if the project is a old project and fetch all the old prompts from the Project DB call 
    // 
    const {prompt, projectId} = req.body
    await prismaClient.prompt.create({
        data :{
            content: prompt,
            projectId, 
            type: "USER"
        }
    })
    const allPrompt = await prismaClient.prompt.findMany({
        where : {
            projectId
        }, orderBy: {
            createdAt : "asc"
        }
    })
    let artifactProcessor = new ArtifactProcessor("", (filePath, fileContent) => handleFileUpdate(filePath, fileContent, projectId), (shellCommand) => {
        handleShellCommand(shellCommand, projectId)
    })
    let artifact =""
    let response = client.messages.stream({
        messages: allPrompt.map((p: any) => ({
            role: p.type ==="USER" ? "user" : "assistant",
            content : p.content,
        })), 
        system: getSystemPrompt(WORK_DIR),
        model:"claude-haiku-4-5-20251001", 
        max_tokens : 8000,
    })
    .on('text', (text) => {
        artifactProcessor.append(text)
        artifactProcessor.parse()
        artifact+=text
    })
    .on('finalMessage', async (message) => {
        console.log("Finished Fetching from LLm ")
        await prismaClient.prompt.create({
            data : {
                content: artifact, 
                projectId, 
                type: "SYSTEM"
            }
        })



        await prismaClient.actions.create({
            data : {
                content: "Done!", 
                projectId
            }
        })
    })
    .on('error', (error) => {
        console.log("error", error)
    });
    res.json({response})
})

function buildFileTree(dir: string, baseDir: string): any[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.map(entry => {
        const relativePath = path.relative(baseDir, path.join(dir, entry.name))
        if (entry.isDirectory()) {
            return {
                name: entry.name,
                path: relativePath,
                type: 'directory',
                children: buildFileTree(path.join(dir, entry.name), baseDir)
            }
        }
        return { name: entry.name, path: relativePath, type: 'file' }
    })
}

app.get("/v1/files/:projectId", (req, res) => {
    const projectDir = getProjectDir(req.params.projectId)
    if (!fs.existsSync(projectDir)) return res.json({ files: [] })
    res.json({ files: buildFileTree(projectDir, projectDir) })
})

app.get("/v1/files/:projectId/download", (req, res) => {
    const projectDir = getProjectDir(req.params.projectId)
    if (!fs.existsSync(projectDir)) return res.status(404).json({ message: "Project not found" })
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="project.zip"`)
    const zip = ChildProcess.spawn('zip', ['-r', '-', '.'], { cwd: projectDir })
    zip.stdout.pipe(res)
    zip.stderr.on('data', (d) => console.error(d.toString()))
})

app.get("/v1/files/:projectId/content", (req, res) => {
    const filePath = req.query.path as string
    if (!filePath) return res.status(400).json({ message: "path is required" })
    const fullPath = path.join(getProjectDir(req.params.projectId), filePath)
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: "File not found" })
    res.json({ content: fs.readFileSync(fullPath, 'utf-8') })
})

app.listen(3001, () => {
    console.log("Worked Backend on Port 3001")
})