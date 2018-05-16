require('dotenv').config()
const puppeteer = require('puppeteer')
const io = require('socket.io-client')

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
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      this.page = (await this.browser.pages())[0]
      await this.page.goto('https://www.mercadopago.com.br')
    }
  }

  /**
   * Login in mercadopago.
   * 
   * @param {String} email
   * @param {String} password
   * @returns {Promise.<void>}
   */
  async login (email, password) {
    await this.goToLoginPage()

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

    await this.page.waitForSelector('.result-ok', { timeout: 5000 })
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

const socket = io(process.env.SERVER_URI)
const mercadoPago = new MercadoPago()
const moneyRequests = []

socket.on('connect', async () => {
  await mercadoPago.launch()
})

socket.on('money-request', data => {
  moneyRequests.push(data)
})

const loop = async () => {
  if (moneyRequests.length) {
    const [_id, email, amount, message] = moneyRequests.shift()
    try {
      await mercadoPago.moneyRequest(email, amount, message)
      socket.emit('money-request/finish', _id)
    } catch (err) {
      socket.emit('money-request/error', [_id, err.message])
    }
  }
  setTimeout(loop, 1000)
}
loop()
