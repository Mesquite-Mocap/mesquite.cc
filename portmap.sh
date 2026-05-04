sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to 8080
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to 8443
