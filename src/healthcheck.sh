#!/bin/sh
if ! [ -x "$(command -v curl)" ]; then
  apt update
  apt install curl -y
fi
curl --fail --data-binary '{"jsonrpc":"1.0","method":"getblockchaininfo","params":[]}' http://$BTC_RPC_USER:$BTC_RPC_PASSWORD@127.0.0.1:8332/
