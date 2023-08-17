const _ = require('lodash')
const flow = require('lodash/fp/flow')
const head = require('lodash/fp/head')
const pick = require('lodash/fp/pick')
const keys = require('lodash/fp/keys')
const fs = require('fs')
const yaml = require('js-yaml')
const args = require('yargs').argv
const timestamp = _.now()
let multiFile = false
let envId
let isDev
let environmentType
let environmentTypes
let environments
let config
let defaultsEnvVars = {}
let processEnv = {
  NODE_ENV: 'prod'
}

function load (opts) {
  let env, basepath, configfile;

  if (_.isPlainObject(opts)) {
    ({env, basepath, configfile, defaultsEnvVars} = opts)
  }

  Object.assign(processEnv, defaultsEnvVars, process.env)

  config = loadConfig(basepath, configfile)
  environments = config.environments || {default: 'prod'}
  envId = getEnvId(config, env)
  isDev = ['DEV','DEVELOP','DEVELOPMENT'].includes(envId.toUpperCase());
  environmentTypes = environments.static || keys(config)
  environmentType = _.includes(environmentTypes, envId) ? envId : environments.default
  config = swapVariables(config)
  return config
}

function loadConfigFile (file) {
  try {
    let text = fs.readFileSync(file, 'utf8')
    let subbed = substitute(processEnv, text)
    return yaml.load(subbed.replace)
  } catch (e) {
    if (!/ENOENT:\s+no such file or directory/.test(e)) {
      console.log('Error Loading ' + file + ':', e)
      throw e
    }
  }
}

function loadConfig (basepath = '.', configfile = 'config.yml') {
  if (fs.existsSync(`${basepath}/${configfile}`)) {
    return loadConfigFile(`${basepath}/${configfile}`)
  }
  else if(fs.existsSync(`${basepath}/config`)) {
    let tmpl = {}
    multiFile = true
    let files = fs.readdirSync(`${basepath}/config`)
    for (let i = 0; i < files.length; i++) {
      if (files[i].endsWith('.yml')) {
        let keyName = files[i].substring(0, files[i].length - '.yml'.length)
        tmpl[keyName] = loadConfigFile(`${basepath}/config/` + files[i])
      }
    }
    return tmpl
  }
  else {
    console.log(`Not found config in path: ${basepath}`);
    throw new Error(`Not found config in path: ${basepath}`);
  }
}

function getEnvId (obj, env) {
  return env ||
        args.env ||
        flow(
          pick(keys(obj)),
          keys,
          head
        )(args) ||
        processEnv.NODE_ENV
}

function substitute (file, p) {
  let success = false
  let replaced = p.replace(/\${([\w.-]+)}/g, function (match, term) {
    if (!success) {
      success = _.has(file, term)
    }
    return _.get(file, term) || _.get(file.defaultsEnvVars, term) || match
  })
  return {success: success, replace: replaced}
}

function transform (file, obj) {
  let changed = false

  let resultant = _.mapValues(obj, function (p) {
    if (_.isPlainObject(p)) {
      let transformed = transform(file, p)
      if (!changed && transformed.changed) {
        changed = true
      }
      return transformed.result
    }

    if (_.isString(p)) {
      let subbed = substitute(file, p)
      if (!changed && subbed.success) {
        changed = true
      }
      return subbed.replace
    }

    if (_.isArray(p)) {
      for (let i = 0; i < p.length; i++) {
        if (_.isString(p[i])) {
          p[i] = substitute(file, p[i]).replace
        }
      }
    }

    return p
  })
  return {changed: changed, result: resultant}
}

function log () {
  console.log('CONFIG:', envId || '-', environmentType || '-')
}

function requireSettings (settings) {
  let erredSettings = []
  settings = _.isString(settings) ? [settings] : settings
  _.forEach(settings, function (setting) {
    if (!_.has(config, setting)) {
      erredSettings.push(setting)
    }
  })

  if (erredSettings.length > 1) {
    throw new Error('The following settings are required in config yml file: ' + erredSettings.join('; '))
  }

  if (erredSettings.length === 1) {
    throw new Error(erredSettings[0] + ' is required in config yml file')
  }
}

function swapVariables (configFile) {
  function readAndSwap (obj) {
    let altered = false
    do {
      let tmp = transform(obj, obj)
      obj = tmp.result
      altered = tmp.changed
    } while (altered)
    return obj
  }

  let file = multiFile ? _.mapValues(configFile, readAndSwap) : configFile
  file = _.merge(
    {},
    file || {},
    file[environmentType] || {},
    {
      envId,
      isDev,
      timestamp
    })

  /* unuseful replaced in loadConfigFile  const enved = transform(process.env, file).result;
  file = readAndSwap(enved)
  return file */
  return readAndSwap(file)
}
module.exports = function (opts) {
  return load(opts)
}
module.exports.load = load
module.exports.log = log
module.exports.require = requireSettings
