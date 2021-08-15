# Armor Network RPC Wallet

```
/**
*      ___   _____        ___  ___   _____   _____   
*     /   | |  _  \      /   |/   | /  _  \ |  _  \  
*    / /| | | |_| |     / /|   /| | | | | | | |_| |  
*   / / | | |  _  /    / / |__/ | | | | | | |  _  /  
*  / /  | | | | \ \   / /       | | | |_| | | | \ \  
* /_/   |_| |_|  \_\ /_/        |_| \_____/ |_|  \_\
*
*  __   _   _____   _____   _          __  _____   _____    _   _   
* |  \ | | | ____| |_   _| | |        / / /  _  \ |  _  \  | | / /  
* |   \| | | |__     | |   | |  __   / /  | | | | | |_| |  | |/ /   
* | |\   | |  __|    | |   | | /  | / /   | | | | |  _  /  | |\ \   
* | | \  | | |___    | |   | |/   |/ /    | |_| | | | \ \  | | \ \  
* |_|  \_| |_____|   |_|   |___/|___/     \_____/ |_|  \_\ |_|  \_\
*
* A fast, easy and anonymous payment system.
* https://armornetwork.org
*
**/

```

A RPC wallet written in JavaScript for Armor Network.

# Usage

## Requirements

- Node.js v12.0+
For Ubuntu:

```
 curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash
 sudo apt-get install -y nodejs
```
- Armor network daemon running locally. Follow the instructions here **[Armor Network Repository](https://github.com/armornetworkdev/armor)**

## Configuration

config.json file
```
{
  "walletd": {
  	"host": "127.0.0.1",
  	"port": 58082,
  	"httpPassword": "user:password"
  }
}
```
## Run

```
git clone https://github.com/armornetworkdev/rpc-armor.git
cd rpc-armor
npm update
node rpc-armor
```
