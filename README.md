<p align="center">
  <img
    src="https://storage.googleapis.com/bridge-assets/Bridge_Logo_Black.png"
    width="125px;">
</p>
<h3 align="center">Bridge Protocol Integration Service</h3>

# Summary
The Bridge Protocol Integration Service enables Network Partners and Verification Partners to easily integrate the Bridge Passport and Protocol to existing solutions connect to the Bridge Protocol Network public API.

# Configuration 
### Config.json keys
- **passportFile**: specify a passport json, default will be ./passport.json
- **passportPassphrase**: Passphrase for the passport 
- **securityHeaderValue**: The value of the "securityheader" required for any request to the service
- **bridgeApiBaseUrl**: The location of the Bridge Protocol Public API for interaction with the network

# Installing dependencies
- Navigate to ./src
- `npm i`

# Starting the service
- `npm start`
