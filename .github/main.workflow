workflow "New workflow" {
  on = "push"
  resolves = ["Setup Node.js for use with actions"]
}

action "Setup Node.js for use with actions" {
  uses = "actions/setup-node@1c24df3126f980b4928e9186e99f46add89bc7ad"
}
