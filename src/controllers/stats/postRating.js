const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const calculateRating = (postStats, maxStats) => {
  const { clicks, keypresses, mouseMovements, scrolls, totalTime } = postStats

  const maxClicks = maxStats.clicks || 1
  const maxKeypresses = maxStats.keypresses || 1
  const maxMouseMovements = maxStats.mouseMovements || 1
  const maxScrolls = maxStats.scrolls || 1
  const maxTotalTime = maxStats.totalTime || 1

  let sumOfRatios = 0
  let countOfNonZeroStats = 0

  if (clicks > 0) {
    sumOfRatios += clicks / maxClicks
    countOfNonZeroStats++
  }
  if (keypresses > 0) {
    sumOfRatios += keypresses / maxKeypresses
    countOfNonZeroStats++
  }
  if (mouseMovements > 0) {
    sumOfRatios += mouseMovements / maxMouseMovements
    countOfNonZeroStats++
  }
  if (scrolls > 0) {
    sumOfRatios += scrolls / maxScrolls
    countOfNonZeroStats++
  }
  if (totalTime > 0) {
    sumOfRatios += totalTime / maxTotalTime
    countOfNonZeroStats++
  }

  if (countOfNonZeroStats === 0) {
    return 0
  }

  const rating = (sumOfRatios / countOfNonZeroStats) * 100
  return Math.min(rating, 100)
}

const getPostRating = async (req, res) => {
  if (!req.body) return res.status(400).send('Please use request-body')
  try {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID is required' })

    let stats
    const articleExists = await prisma.article.findUnique({
      where: { article_id: id }
    })

    if (articleExists) {
      stats = await prisma.stat.findMany({
        where: { article_id: id }
      })
    } else {
      const topicExists = await prisma.topic.findUnique({
        where: { topic_id: id }
      })

      if (!topicExists) {
        return res.status(404).json({ error: 'ID does not exist' })
      }

      stats = await prisma.stat.findMany({
        where: { topic_id: id, article_id: null }
      })
    }
    if (stats.length === 0) {
      return res.status(200).json({ response: 'No stats available for the given ID or stats list is empty' })
    }

    const allStats = await prisma.stat.findMany()
    const maxStats = {
      clicks: Math.max(...allStats.map((stat) => stat.clicks)),
      keypresses: Math.max(...allStats.map((stat) => stat.keypresses)),
      mouseMovements: Math.max(...allStats.map((stat) => stat.mouseMovements)),
      scrolls: Math.max(...allStats.map((stat) => stat.scrolls)),
      totalTime: Math.max(...allStats.map((stat) => stat.totalTime))
    }

    const specificStats = stats.reduce(
      (acc, stat) => {
        acc.clicks += stat.clicks
        acc.keypresses += stat.keypresses
        acc.mouseMovements += stat.mouseMovements
        acc.scrolls += stat.scrolls
        acc.totalTime += stat.totalTime
        return acc
      },
      { clicks: 0, keypresses: 0, mouseMovements: 0, scrolls: 0, totalTime: 0 }
    )

    const postRating = Math.min(calculateRating(specificStats, maxStats), 100)

    if (articleExists) {
      const articles = await prisma.article.findMany({
        include: {
          stats: true
        }
      })

      const ratings = articles.map((article) => {
        const articleStats = article.stats.reduce(
          (acc, stat) => {
            acc.clicks += stat.clicks
            acc.keypresses += stat.keypresses
            acc.mouseMovements += stat.mouseMovements
            acc.scrolls += stat.scrolls
            acc.totalTime += stat.totalTime
            return acc
          },
          { clicks: 0, keypresses: 0, mouseMovements: 0, scrolls: 0, totalTime: 0 }
        )

        const rating = Math.min(calculateRating(articleStats, maxStats), 100)
        return {
          article_id: article.article_id,
          rating
        }
      })

      res.status(200).json({ postRating, ratings })
    } else {
      const topics = await prisma.topic.findMany({
        include: {
          Stat: true
        }
      })

      const ratings = topics.map((topic) => {
        const articleStats = topic.Stat.reduce(
          (acc, stat) => {
            acc.clicks += stat.clicks
            acc.keypresses += stat.keypresses
            acc.mouseMovements += stat.mouseMovements
            acc.scrolls += stat.scrolls
            acc.totalTime += stat.totalTime
            return acc
          },
          { clicks: 0, keypresses: 0, mouseMovements: 0, scrolls: 0, totalTime: 0 }
        )

        const rating = Math.min(calculateRating(articleStats, maxStats), 100)
        return {
          topic_id: topic.topic_id,
          rating
        }
      })
      res.status(200).json({ postRating, ratings })
    }
  } catch (error) {
    console.error('Error calculating post rating:', error)
    res.status(500).json({ error: 'Error calculating post rating' })
  }
}

module.exports = { getPostRating }