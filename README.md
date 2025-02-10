# ConfigYml

[![configYml](https://img.shields.io/npm/v/@stefcud/configyml.svg)](https://www.npmjs.com/package/@stefcud/configyml)

Simple and smart Yaml configurator for NodeJs applications

THIS IS A FORK OF THE ORIGINAL IS ABANDONED REPOSITORY

_improved version by @stefanocudini_
- support basepath to search configs
- removed moment dependecy
- pass more options by object
- defaultsEnv object to set defaults value for undefined process.env variables

```
$ npm install @openmove/configyml --save
```

## Install
```
$ npm install @openmove/configyml --save
```

## Usage
Use config for yaml config files in Node.js projects.  For example you might have a project with the following
config.yml file in the project dir.

```yaml

app:
    url: http://myapp.com/home
    cache: redis

db:
    location: mysql-db-prod

```

This config can be accessed like this.

```javascript

const config = require('@stefcud/configyml')();

console.log(config.app.url);
console.log(config.app.cache);
console.log(config.db.location);

```    


### Custom base path

Set the base path to search config.yml, search to parent folder

```js
const config = require('@openmove/configyml')({basepath: '..', defaultsEnvVars: {DBUSER: 'guest'}})
```

### Custom filename

load specific config file for any project

```js
const namespace = 'projectname';
const config = require('@openmove/configyml')({configfile: `config.${namespace}.yml`})
```


## Substitution
You can substitute variables in the `config.yml` like this.

```yaml

defaultsEnvVars:
  DBNAME: 'mydb'

dns: myapp.com

app:
    url: http://${dns}/home
    cache: redis

db:
    location: mysql-db-prod
    user: ${DBUSER}
    dbname: ${DBNAME}

```

if $DBUSER environment var is not defined use default value inside _defaultsEnvVars_ on instance options
if $DBNAME environment var is not defined use default value inside _defaultsEnvVars_ on config.yml option

This config would yield the following.

```javascript

console.log(config.app.url);

// outputs - http://myapp.com/home

```

## Config Folder
Instead of having a file named `config.yml` with all of your environment settings in place, you could have a `config` folder 
at the root level of your project. This module will read in every `.yml` file, and return an object that looks like:
```javascript
{
    [file-name]: [parsed-file-contents],
    ...,
} 
```

if you need to do cross-file referencing, you can, via dot-notation:
```yaml
# file `a.yml`
foo: bar
```
```yaml
#file `b.yml`
baz: ${a.foo}
```
will get you
```javascript
{
    a: {foo: 'bar'},
    b: {baz: 'bar'}
}
```

## Environment Specific Settings
Based on an Environment ID, you can designate specific override settings for different types of environments.  First
you have to specify your Environment ID.  You can do so in one of several ways.  The first Environment ID that is
found in the following order wins.

1. [--env command line argument](#Environment-ID:---env-Argument)
2. [--${static-environment} command line argument](#Environment-ID:---${static-environment}-Argument)
3. [NODE_ENV process environment setting](#Environment-ID:-NODE_ENV)
4. [git branch name with regex filtering](#Environment-ID:-git-branch)

### Static Environments
To understand this better let's first talk about Static Environments.  These are environments that have their own
environment specific settings or [Environment Overrides](#Environment-Overrides).  Not necessarily all environments
have their own environment specific settings, but those that do should be defined as Static Environments in
the config.yml as follows:

```yaml

environments:
    static:
        - dev
        - test
        - prod

```

### Keys as environments
The other approach you can take is to have top level keys that only consist of your environments. 

#### Using a single config.yml file
setup your config.yml as follows:
```yaml
dev:
    # ...
test:
    # ...
prod:
    # ...
```

#### Using a Config folder.
Your filenames determine the keys, so your directory could be set as follows:

```
config/dev.yml
config/test.yml
config/prod.yml
```

### Environment ID: load Argument
Set the Environment ID using the load function.

```js
const config = require('@stefcud/configyml').load('myenvironment')
```


### Environment ID: --env Argument
Set the Environment ID using --env command line argument.

```
node app.js --env feature-xyz
```

This is often helpful when running gulp tasks.

```
gulp deploy --env feature-xyz
```

### Environment ID: --${static-environment} Argument
For Static Environments set the Environment ID using the static environment id as an argument.

```
gulp deploy --prod
```

### Environment ID: NODE_ENV
Set the Environment ID using NODE_ENV process environment variable.

```
export NODE_ENV=feature-xyz
```

### Environment ID: git branch
If an Environment ID is not found using one of the other methods, it will use the git branch for the current project
folder.  This branch can be filtered using regex.  Let's say your current branch is `Features/ISSUE-123-feature-xyz`,
and you have the following setting in your config.yml.

```yaml

branchRegex: Features/ISSUE-\d+-((\w|-)+)

```

The Environment ID will be `feature-zyz`.  If no branchRegex is given the branch name will be taken as is.


### Environment ID Substitution
The Environment ID can be substituted into the config.yml.  Let's say you have an Environment ID `feature-xyz` and
the following config.yml.

```yaml
dns: ${envId}.myapp.com

app:
    url: http://${dns}/home
    cache: redis

db:
    location: MYSQL-DB-${ENVID}
```

This will yield the following:

```javascript
const config = require('@stefcud/configyml')();

console.log(config.dns);          // feature-xyz.myapp.com
console.log(config.app.url);      // http://feature-xyz.myapp.com
console.log(config.db.location);  // MYSQL-DB-FEATURE-XYZ

```

### Environment Overrides

For Static Environments, settings can be overridden for that specific environment.  For example, with the following
config.yml:

```yaml
dns: ${envId}.myapp.com

app:
    url: http://${dns}/home
    cache: redis

db:
    location: MYSQL-DB-${ENVID}

prod:
    app:
        url: https://${dns}
    db:
        location: DB-${ENVID}

```

and the following app.js file:


```javascript
const config = require('@stefcud/configyml')();

console.log(config.dns);
console.log(config.app.url);
console.log(config.app.cache);
console.log(config.db.location);

```

the following command:

```
node app.js --prod
```

would output the following:

```
prod.myapp.com
https://prod.myapp.com
redis
MYSQL-DB-PROD
```
