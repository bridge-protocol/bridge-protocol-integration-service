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
- **port**: The port number to listen on
- **passportFile**: specify a passport json, default will be ./passport.json
- **securityHeaderValue**: The value of the "securityheader" required for any request to the service
- **bridgeApiBaseUrl**: The location of the Bridge Protocol Public API for interaction with the network
- **passportPassphrase**: Passphrase for the passport (optional, required if not provided in command line arguments)

### Command Line Arguments
- **passphrase**: Passphrase for the passport file (optional, required if not provided in config.json)

# Starting the Service
- **with config.json passphrase**: `npm start`
- **with command line argument passphrase**: `npm start passphrase=12345`

