const puppeter = require('puppeteer')

let browser = null

class MercadoPago {
  constructor () {
    this.browser = null
    this.page = null
  }

  async launch () {
    this.browser = await puppeter.launch({ headless: true })
    this.page = await this.browser.newPage()
  }

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

  async moneyRequest (email, amount, message) {
    await this.page.goto('https://www.mercadopago.com.br/money-request')

    await this.page.waitForSelector('#newEmail')
    await this.page.type('#newEmail', email)

    await this.page.waitForSelector('#amount')
    await this.page.type('#amount', amount)
    
    await this.page.waitForSelector('#note')
    await this.page.type('#note', message)

    await this.page.waitForSelector('#postBtn')
    await this.page.click('#postBtn')
  }
}


const mercadoPago = new MercadoPago()

setImmediate(async () => {
  await mercadoPago.launch()
  await mercadoPago.login('mentifg@gmail.com', 'WILD120')

  setInterval(async () => {
    await mercadoPago.moneyRequest('code.040815162342@gmail.com', '999,58', 'C2onta league of legends 150 skins, elo diamante III com todos os campeões')
  }, 10000)
})


