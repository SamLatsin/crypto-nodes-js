# crypto-nodes-js
Rewritten from php to node js crypto-nodes with docker and easy installation. Backend HTTP-JSON API for working with the most famous cryptocurrencies: Bitcoin, Ethereum and TRON.

## Status - idle
## Upcoming - TON and BNB

## Overview
Aggregator of the most famous cryptocurrencies written in [Node JS](https://nodejs.org/en/) [Express.js](http://expressjs.com/), persistant storage is [PostgreSQL](https://www.postgresql.org/). See [API documentation](https://sam-latsin.gitbook.io/crypto-nodes-js-eng/).
### Use cases
* Crypto P2P exchange
* Online marketplace
* Banking
* Personal purposes like cold wallet
### Features
For all curriencies:
* Create wallets
* Check balance
* Generate new address
* Check node status
* Network fee calculation
* Send cryptocurrency
* Get history of transactions
* Wallet recover with progress status
* Get transaction info
* Node auto restart on fail or boot
* Auto DB backup

Bitcoin special features:
* Multiple wallets import by private key or mnemonic
* Cron task for checking imported wallets and sending all bitcoins to one wallet from them
* No fee between addresses in same wallet
* Wallletnotify implementation for updating transaction list
* No external API dependecy
* Raw transactions with multiple inputs/outputs support

Ethereum special feature:
* Support for ERC20 tokens (add, delete, get)

Tron special feature:
* Support for TRC20 tokens (add, delete, get)

### What needs to be done
* Remove external API dependency for Tron and Ethereum networks
* Add new currencies
### Requirements
* Linux server
* At least 4 TB SSD
* At least 32 GB RAM
* [etherscan.io API token](https://etherscan.io/apis)

### Installation
The installation process way easier as previos crypto-nodes

All you need to do is create `.env` file in `src/` folder containing:
```
PG_DBNAME={YOUR_DB_NAME}
PG_USER={YOUR_DB_USER}
PG_PASSWORD={YOUR_DB_PASSWORD}
BTC_ENABLED = 1 # enable (1) or disable (0) btc endpoints
BTC_TOKEN={YOUR_BTC_TOKEN_TO_ACCESS_FUNCTIONALITY}
BTC_RPC_USER={YOUR_BTC_USER_FOR_RPC_CALLS}
BTC_RPC_PASSWORD={YOUR_BTC_PASSWORD_FOR_RPC_CALLS}
BTC_TESTNET=0 # net type, 0 - mainnet, 1 - testnet
BTC_FORWARD_ADDRESS={ADDRESS_FOR_FORWARDING_BITCOINS_FROM_FILE_RECOVERED_WALLETS}
ETH_ENABLED = 1 # enable (1) or disable (0) eth endpoints
ETH_TESTNET=0 # net type, 0 - mainnet, 1 - sepolia testnet
ETH_TOKEN={YOUR_ETH_TOKEN_TO_ACCESS_FUNCTIONALITY_OF_ETH_AND_ERC20}
ETHERSCAN_API_KEY={YOUR_GENERATED_ETHERSCAN_API_KEY}
TRX_ENABLED = 1 # enable (1) or disable (0) trx endpoints
TRX_TESTNET=0 # net type, 0 - mainnet, 1 - nile testnet
TRX_TOKEN={YOUR_TRX_TOKEN_TO_ACCESS_FUNCTIONALITY_OF_TRX_AND_TRC20}
```

Then just run `docker compose up` and you done.

After all steps done you can check if API works, check [API documentation](https://sam-latsin.gitbook.io/crypto-nodes-js-eng/).

## License

Crypto-nodes-js is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
