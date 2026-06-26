import express from 'express'
import { submitContact, subscribeNewsletter } from '../controllers/contactController.js'

const router = express.Router()

router.post('/', submitContact)
router.post('/newsletter', subscribeNewsletter)

export default router
