#!/bin/sh
curl 'http://app:5656/api/walletnotify/btc' -X 'POST' -d "txid=$1&name=$2&token=$BTC_TOKEN"

