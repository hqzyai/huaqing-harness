#!/bin/sh
set -eu
if [ "${TEAM_LOCAL_DEVELOPMENT:-0}" = '1' ]; then
  node -e 'const u=new URL(process.env.TEAM_PUBLIC_ORIGIN);if(u.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(u.hostname))throw new Error("Local development requires a loopback HTTP origin")'
else
  docker info --format '{{json .SecurityOptions}}' | node -e 'let value="";process.stdin.on("data",d=>value+=d);process.stdin.on("end",()=>{if(!JSON.parse(value).includes("name=rootless"))throw new Error("Team production deployment requires a dedicated rootless Docker daemon")})'
fi
: "${TEAM_GATEWAY_CONTAINER:?Set the gateway container name}"
: "${TEAM_CONTROL_NETWORK:?Set the control network name}"
TEAM_BIND_HOST=$(docker inspect "$TEAM_GATEWAY_CONTAINER" --format '{{json .NetworkSettings.Networks}}' | node -e 'let value="";process.stdin.on("data",d=>value+=d);process.stdin.on("end",()=>{const networks=JSON.parse(value),control=networks[process.env.TEAM_CONTROL_NETWORK];if(require("node:net").isIP(control?.IPAddress)!==4)throw new Error("Gateway control network needs a concrete IPv4 address");if(!(control.GwPriority>Math.max(0,...Object.entries(networks).filter(([name])=>name!==process.env.TEAM_CONTROL_NETWORK).map(([,network])=>network.GwPriority))))throw new Error("The control network must have a higher gw-priority than every user network");process.stdout.write(control.IPAddress)})')
export TEAM_BIND_HOST
if [ "${1:-}" = 'healthcheck' ]; then
  exec node -e 'const req=require("node:http").get({hostname:process.env.TEAM_BIND_HOST,port:process.env.TEAM_PORT,path:"/team/health",headers:{host:new URL(process.env.TEAM_PUBLIC_ORIGIN).host}},res=>{res.resume();res.on("end",()=>process.exit(res.statusCode===200?0:1))});req.on("error",()=>process.exit(1))'
fi
exec node /opt/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js --profile team
