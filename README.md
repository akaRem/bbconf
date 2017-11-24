# BBCONF

BitBucket Server management utility

## Usage

`node ./src --help`

### Create connection config (see example folder)

Place connection configuration in this format (f.e. connection.yaml)

```yaml
---
connection:
  user: admin
  email: admin@example.com
  password: admin
  baseUrl: http://localhost:7995/bitbucket
```

### Create config file (see example folder)

You may also export existing config from your BitBucket with this cmd:

`node ./src -c connection.yaml --export config.yaml`

This is a good starting point to create your own configuration file.

### Apply configuration file

After you have config.yaml that fully satisfies your desired state, apply it:

`node ./src -c connection.yaml -i config.yaml --apply`

### Check changes

Apply with `--export` flag

`node ./src -c connection.yaml -i config.yaml --apply --export before.yaml`

Export one more time (don't `--apply`)

`node ./src -c connection.yaml -i config.yaml --export after.yaml`

Diff with your fav tool, for example

`diff -u before.yaml after.yaml`

## Limitations

User management is tested for internal bb directory only. This means that bbconf
may try to delete users and groups added via LDAP. Behavior is untested, so who
knows the result. Mark users and groups directives with ignore keyword (see how
it's done in tests).

Logging should be improved.

Dry run option is currently handled in client and it just stops all non-GET
requests.

`node ./src -c connection.yaml -i config.yaml --apply --dryRun`

Work still in progress.

## Development

Build your docker image with BB: `yarn run docker:bb:build`.

Start your docker container with BB: `yarn run docker:bb:run`.

To run tests `yarn run test`

To apply example config `node ./src -c example/connection.yaml -i
example/config.yaml --logger.outputFile bbconf.log --apply`
