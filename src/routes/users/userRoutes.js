const express = require('express')
const router = express.Router()
const userController = require('../../controllers/users')

const app = express()

router.post('/users', userController.addUser)
router.post('/add-all-users', app.use(express.json()), userController.addAllUsersToDB)
router.get('/users', userController.getAllUsers)
router.get('/user', userController.getUserById)
router.patch('/users', userController.updateUser)
router.delete('/user', userController.deleteUser)
router.delete('/users/clear', userController.clearDatabase)

router.get('/users/:postType', userController.getUsersPosts)

module.exports = router;
