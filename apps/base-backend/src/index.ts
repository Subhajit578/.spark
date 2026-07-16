import 'dotenv/config'
import express from 'express'
import cors from "cors"
import { prismaClient} from '@repo/db'
import {UserSchema, JWT_SECRET} from '@repo/common/types'
import {authMiddleware} from "@repo/common/middleware"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import axios from 'axios'
const app = express()
app.use(cors())
app.use(express.json())

//TODO 1 : Signup EndPoint
app.post("/v1/signup", async (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const safeData = UserSchema.safeParse(req.body)
    if(!safeData.success){
        res.status(422).send({message : "Invalid Inputs"})
    } else {
        try {
            const hashedPassword = await bcrypt.hash(password, 10)
            const user = await prismaClient.user.create({data : {
                email : email, 
                password: hashedPassword
            }})
            res.status(200).send({message : "User Created", user})
        } catch(err) {
                console.log(err)
               res.status(500).send({message : "Error connecting to DB"})
        }
    }
})

//TODO 2 : Signin Endpoint

app.post("/v1/signin", async (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const safeData = UserSchema.safeParse(req.body)
    if(!safeData.success) {
        res.status(422).send({message : "Ivalid Inputs"})
    } else {
        try {

        
        const user = await prismaClient.user.findFirst({
            where : {email}, 
            select : { email: true, id: true, password : true
            }
        })
        if(!user) {
            return res.status(404).send({message : "User not found"})
        } else {
            const passwordMatch = await bcrypt.compare(password, user.password)
            if(!passwordMatch) {
                return res.status(401).send({message: "Invalid Password"})
            } else {
                const token = jwt.sign({userId: user.id, email: user.email}, JWT_SECRET)
                res.status(200).send(token)
            }
        }
    } catch(err) {
        return res.status(500).send({message : "Error Connecting to DB"})
    }
    }
})
//TODO 3: Create a Project EndPoint
app.post("/v1/projects", authMiddleware, async (req, res) => {
    const {prompt} = req.body
    const userId = req.userId!
    const description = prompt.split("\n")[0]
    try {
        const project = await prismaClient.project.create({
            data : {description, userId}
        })
        try {
            const response = await axios.get(`http://localhost:3003/${project.id}`,{data : { projectId: project.id
            }})
            await prismaClient.project.update({where :{id :project.id}, data: { machineIp: response.data.ip }})
        } catch (err) {
            console.log("No idle machine available yet")
        }
        res.json({projectId : project.id})
    } catch (err) {
        console.log(err)
        return res.status(500).send({message: "Error Connecting to DB"})
    }
})


//TODO 4: Get all the projects of a User 

app.get("/v1/projects", authMiddleware, async (req, res) => {
    const userId = req.userId!;
  const projects = await prismaClient.project.findMany({
    where: { userId },
  });
  res.json({ projects });
})

//TODO 5: Get all prompts of a User
app.get("/v1/projects/:projectId", authMiddleware, async (req, res) => {
    const userId = req.userId!;
  const projectId = req.params.projectId as string;

  const prompts = await prismaClient.prompt.findMany({
    where: { projectId},
  });
  const project = await prismaClient.project.findUnique({
    where: { id :projectId },
  });
  res.json({ prompts, machineIp:project?.machineIp});
})

//TODO 5: Get all Actions of the User
app.get("/v1/actions/:projectId", authMiddleware, async (req, res) => {
    const userId = req.userId!;
  const projectId = req.params.projectId as string;
  const actions = await prismaClient.actions.findMany({
    where: { projectId },
  });
  res.json({ actions });
})

app.listen(3000, () => {
    console.log("Server running on port 3000")
})