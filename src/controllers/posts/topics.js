const { PrismaClient } = require('@prisma/client')
const RedisClient = require('../../redis')

const prisma = new PrismaClient()

const createTopic = async (req, res) => {
  let newTopic
  let stat
  let existingTopic

  try {
    const { user_id, title, content, categories, topic_id } = req.body

    if (!user_id) return res.status(400).json({ error: 'user_id is required' })
    if (!title) return res.status(400).json({ error: 'title is required' })
    if (!content) return res.status(400).json({ error: 'content is required' })
    if (!topic_id) return res.status(400).json({ error: 'topic_id is required' })

    const user = await prisma.user.findUnique({
      where: { user_id }
    })
    if (!user) {
      console.error('User not found!')
      return res.status(400).json({ message: 'User Not Found!' })
    }

    const newTopicData = {
      user: {
        connect: { user_id: user_id }
      },
      title,
      content,
      topic_id,
      categories
    }

    const statData = {
      user_id,
      topic_id: newTopicData.topic_id,
      article_id: null,
      clicks: 0,
      keypresses: 0,
      mouseMovements: 0,
      scrolls: 0,
      totalTime: 0
    }

    try {
      existingTopic = await prisma.topic.findUnique({
        where: { topic_id }
      })
    } catch (e) {
      console.error("Couldn't search for topic", e)
    }

    if (existingTopic) {
      console.log('Existing topic returned')
      return res.json(existingTopic)
    }

    try {
      newTopic = await prisma.topic.create({
        data: newTopicData
      })
    } catch (e) {
      console.error("Couldn't create new topic in DB", e)
      return res.status(500).json({ error: "Couldn't create new topic in DB" })
    }

    try {
      stat = await prisma.stat.create({
        data: statData
      })
    } catch (e) {
      console.error("Couldn't create stat in DB", e)
      return res.status(500).json({ error: "Couldn't create stat in DB" })
    }

    console.log(`Created new topic and stats data. Topic ID: ${newTopic?.topic_id}, Stats id: ${stat.id}`)
    return res.status(201).json({ id: newTopic.topic_id, message: 'Topic created successfully' })
  } catch (e) {
    console.error('Error adding topic:', e)
    return res.status(500).json({ error: 'Error creating topic' })
  }
}

const getAllTopics = async (req, res) => {
  try {
    const topics = await prisma.topic.findMany({
      select: {
        topic_id: true
      }
    })
    if (!topics) return res.status(400).json({ error: 'Topics list empty' })
    return res.status(200).json(topics)
  } catch (e) {
    console.error('Error getting topics list:', e)
    res.status(500).json({ error: 'Error getting topics list' })
  }
}

const getTopic = async (req, res) => {
  try {
    const { topic_id } = req.body
    if (!topic_id) {
      return res.status(400).json({ error: 'Topic ID is required' })
    }

    const topic = await prisma.topic.findUnique({
      where: { topic_id }
    })

    if (!topic) return res.status(400).json({ error: 'Topic not found' })
    res.status(200).json(topic)
  } catch (e) {
    console.error('Error getting topic:', e)
    res.status(500).json({ error: 'Error getting topic' })
  }
}

const getTopicArticles = async (req, res) => {
  try {
    const { topic_id } = req.query
    if (!topic_id) {
      return res.status(400).json({ error: 'Topic ID is required' })
    }

    const topic = await prisma.topic.findUnique({
      where: { topic_id }
    })

    if (!topic) return res.status(400).json({ error: 'Topic not found' })

    const topicArticles = await prisma.article.findMany({
      where: { topic_id }
    })
    res.status(200).json(topicArticles)
  } catch (e) {
    console.log(e)
    res.status(500).json({ error: 'Error getting topic articles' })
  }
}

const deleteTopic = async (req, res) => {
  try {
    const { topic_id } = req.query
    const postKey = `post:${topic_id}`
    const postRatingKey = `postRating:${topic_id}`
    if (!topic_id) return res.status(400).json({ error: 'topic_id is required' })
    const topic = await prisma.topic.findUnique({
      where: { topic_id }
    })

    if (!topic) {
      console.error('Topic not found. Nothing to delete')
      return res.status(400).json({ error: 'Topic not found' })
    }
    await prisma.topic.delete({ where: { topic_id } })
    await RedisClient.json.DEL(postKey)
    await RedisClient.json.DEL(postRatingKey)
    console.log('Topic deleted successfully', topic_id)
    return res.status(200).json({ message: 'Topic deleted successfully' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error deleting topic' })
  }
}

module.exports = {
  createTopic,
  getAllTopics,
  getTopic,
  getTopicArticles,
  deleteTopic
}
