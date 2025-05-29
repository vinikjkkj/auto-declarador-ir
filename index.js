const { readFile, writeFile } = require('fs/promises')
const puppeteer = require('puppeteer')

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))
const delay = 1000
const validRegExp = /^(\d{1,2}\/\d{1,2}\/\d{4}),(?:Pix recebido[:\-]\s*([^,]+)|Cp\s*:(\d+)-([^,]+)|(\d+)\s+(\d+)\s+([A-Z\s]+)),(\d+\.\d{2})$/;

(async () => {
    const chalk = (await import('chalk')).default
    let counter = JSON.parse(await readFile('counter.json', 'utf-8'))
    let isRunning = false
    
    const data = await readFile('data.csv', 'utf-8')
    const pixData = data
        .split('\n')
        .slice(1)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const match = line.match(validRegExp)
            if (match) {
                const [, data, pixNome, cpConta, cpNome, numCodigo, numConta, numNome, valor] = match
                const nome = pixNome || cpNome || numNome
                const conta = cpConta || numConta

                return {
                    data: data,
                    name: nome.trim(),
                    value: parseFloat(valor),
                    accountNumber: conta || undefined
                }
            }
            return null
        })
        .filter(item => item)

    const entries2024 = pixData
        .filter(v => v.data.includes('2024') && (v.value % 5 === 0 || v.value % 10 === 0))
        .slice(counter)
    const firstLength = entries2024.length

    console.log(chalk.yellow(`Encontrados ${firstLength} registros. Pulando ${counter} registros`))
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: './chrome-session',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-device-discovery-notifications'
        ]
    })
    let page = await browser.newPage()
    await page.goto('https://mir.receitafederal.gov.br')

    async function run() {
        await sleep(delay + 2000)
        if (isRunning) {
            return console.log(chalk.red('Já está rodando'))
        }
        const isOnPage = await page.evaluate(() => window.location.href.endsWith('rendimentos'))
        if (!isOnPage) {
            console.log(chalk.red("Não está na pagina, ignorando..."))
            return
        }

        console.log(chalk.green("Página carregada! Iniciando preenchimento..."))

        const entry = entries2024.shift()
        console.log(chalk.yellow(`Rodando para a ${firstLength - entries2024.length - 1}/${firstLength - 1} entrada`))
        isRunning = true

        const [, month, _] = entry.data.split('/')
        await page.waitForSelector('i.fa-solid.fa-plus')
        const childAddButton = await page.$('i.fa-solid.fa-plus');
        const parentAddButton = await childAddButton.evaluateHandle(el => el.parentElement);
        await parentAddButton.click();
        
        await page.waitForFunction(() => window.location.href.endsWith('novo'))

        await sleep(delay + 2000)
        await page.waitForSelector('.ng-select-container')
        await page.evaluate(() => {
            const event = new MouseEvent('mousedown', { bubbles: true });
            document.querySelector('ng-select .ng-select-container')?.dispatchEvent(event);
        });

        await sleep(delay + 1000)
        try {
            await page.waitForSelector('.ng-dropdown-panel .ng-option', { timeout: 3000 });
        } catch(e) {
            console.log(e)
            await page.evaluate(() => {
                const event = new MouseEvent('mousedown', { bubbles: true });
                document.querySelector('ng-select .ng-select-container')?.dispatchEvent(event);
            });
            await sleep(delay + 1000)
        }
        await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('.ng-dropdown-panel .ng-option'));
            const desired = options[33]

            desired.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            desired.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            desired.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        await page.waitForSelector('div.br-radio.d-inline-block.mr-5')
        const personType = (await page.$$('div.br-radio.d-inline-block.mr-5'))[1]
        await personType.click()

        await sleep(delay)
        await page.evaluate(() => {
            const event = new MouseEvent('mousedown', { bubbles: true });
            document.querySelectorAll('ng-select .ng-select-container')[1]?.dispatchEvent(event);
        });

        await sleep(delay)
        await page.evaluate((month) => {
            const options = Array.from(document.querySelectorAll('.ng-dropdown-panel .ng-option'));
            const desired = options[parseInt(month) - 1]
            
            desired.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            desired.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            desired.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, month);
        
        await sleep(delay)
        await page.click('irpf-checkbox')
        
        await sleep(delay)
        await page.evaluate((value) => {
            const valueEl = document.querySelector('br-input[aria-label="Valor Recebido"]  input');
            valueEl.value = parseInt(value) + '00';

            valueEl.dispatchEvent(new Event('input', { bubbles: true }));
            valueEl.dispatchEvent(new Event('change', { bubbles: true }));
        }, entry.value)

        await sleep(delay)
        await page.evaluate(() => {
            const event = new MouseEvent('mousedown', { bubbles: true });
            document.querySelectorAll('ng-select .ng-select-container')[2]?.dispatchEvent(event);
        });

        await sleep(delay)
        await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('.ng-dropdown-panel .ng-option'));
            const desired = options[134]
            
            desired.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            desired.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            desired.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        await sleep(delay)
        await page.evaluate((entry) => {
            const additionalEl = document.querySelector('br-textarea[aria-label="Informações Complementares"] textarea');
            additionalEl.value = `Nome da Pessoa: ${entry.name}\nData do Serviço: ${entry.data}\n${entry.accountNumber ? `Número da Conta da Pessoa: ${entry.accountNumber}` : ''}`;

            additionalEl.dispatchEvent(new Event('input', { bubbles: true }));
            additionalEl.dispatchEvent(new Event('change', { bubbles: true }));
        }, entry)

        counter++
        await writeFile('counter.json', JSON.stringify(counter));
        isRunning = false

        await sleep(delay + 1000)
        const finalButton = await page.$('button.br-button.primary')
        await finalButton.click()
    }

    page.on('framenavigated', async (frame) => {
        if (frame === page.mainFrame()) {
            console.log(chalk.bold('URL mudou para:', frame.url()))
            await run()
        }
    })

    browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
            const newPage = await target.page()
            await newPage.bringToFront()
            console.log(chalk.bold('Nova aba detectada, atualizando...'))
            
            page = newPage
            page.on('framenavigated', async (frame) => {
                if (frame === page.mainFrame()) {
                    console.log(chalk.bold('URL mudou para:', frame.url()))
                    await run()
                }
            })
            await run()
        }
    })

    await run()
})()