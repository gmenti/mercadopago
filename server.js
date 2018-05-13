require('dotenv').config()
const puppeteer = require('puppeteer')
const express = require('express')
const bodyParser = require('body-parser')

class MercadoPago {
  /**
   * MercadoPago constructor instance.
   */
  constructor () {
    this.browser = null
    this.page = null
  }

  /**
   * Launch browser and open page.
   * 
   * @returns {Promise.<void>}
   */
  async launch () {
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS === 'true',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
  }

  /**
   * Login in mercadopago.
   * 
   * @param {String} email
   * @param {String} password
   * @returns {Promise.<void>}
   */
  async login (email, password) {
    await this.page.goto('https://www.mercadolivre.com/jms/mlb/lgz/login?platform_id=mp&go=https://www.mercadopago.com/mlb/accountSummary')

    await this.page.waitForSelector('#user_id')
    await this.page.type('#user_id', email)

    await this.page.waitForSelector('.auth-button--user')
    await this.page.click('.auth-button--user')

    await this.page.waitForSelector('#password')
    await this.page.type('#password', password)

    await this.page.waitForSelector('.auth-button--password')
    await this.page.click('.auth-button--password')

    await this.page.waitForSelector('#Notifications')
  }

  /**
   * Create a money request.
   * 
   * @param {String} email 
   * @param {Number} amount 
   * @param {String} message
   * @returns {Promise.<void>}
   */
  async moneyRequest (email, amount, message) {
    await this.page.goto('https://www.mercadopago.com.br/money-request')

    await this.page.waitForSelector('#newEmail')
    await this.page.type('#newEmail', email)

    await this.page.waitForSelector('#amount')
    await this.page.type('#amount', amount.toString().replace('.', ','))
    
    await this.page.waitForSelector('#note')
    await this.page.type('#note', message)

    await this.page.waitForSelector('#postBtn')
    await this.page.click('#postBtn')

    await this.page.waitForSelector('.result-ok')
  }

  async activities () {
    await this.page.goto('https://www.mercadopago.com.br/activities')
    await this.page.waitForSelector('.activities-list')

    return await this.page.evaluate(() => {
      const rows = document.querySelectorAll('.ui-row__link')
      const activities = []
      for (const row of rows) {
        const [status, email] = row.querySelector('.c-description-classic__status').innerText.split(' - ')
        const price = parseFloat(row.querySelector('meta[itemprop="price"]').getAttribute('content'))
        const id = Number(row.getAttribute('href')
          .replace('/detail', '')
          .replace('http://www.mercadopago.com.br/activities/money_request/', ''))

        activities.push({id, email, price, status})
      }
      return activities
    })
  }
}

const app = express()
app.use(bodyParser.json())

const mercadoPago = new MercadoPago()

app.post('/money-request', async (req, res) => {
  const { email, amount, message } = req.body
  try {
    await mercadoPago.moneyRequest(email, amount, message)
    res.sendStatus(204)
  } catch (err) {
    res.send(500, { message: err.message })
  }
})

app.get('/activities', async (req, res) => {
  res.send(await mercadoPago.activities())
})

app.listen(process.env.PORT, async () => {
  await mercadoPago.launch()
  await mercadoPago.login(process.env.EMAIL, process.env.PASSWORD)
})
