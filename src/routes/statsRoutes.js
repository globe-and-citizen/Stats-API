const express = require('express')
const router = express.Router()
const statsController = require('../controllers/statsController')

router.post('/stats', statsController.create)
router.get('/stats', statsController.read)
router.get('/summary', statsController.summary)

module.exports = router
