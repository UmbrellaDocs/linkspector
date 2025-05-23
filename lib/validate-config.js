import Joi from 'joi'

class ValidationError extends Error {
  constructor(message, details) {
    super(`${message}: ${details.map((d) => d.message).join(', ')}`)
    this.name = 'ValidationError'
    this.details = details
  }
}

/**
 * Validates the configuration file at the given path.
 * @param {string} config - YAML config object.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the validation was successful.
 */
async function validateConfig(config) {
  try {
    // Define the schema for validation
    const schema = Joi.object({
      files: Joi.array().items(Joi.string()),
      dirs: Joi.array().items(Joi.string()),
      excludedFiles: Joi.array().items(Joi.string()),
      excludedDirs: Joi.array().items(Joi.string()),
      fileExtensions: Joi.array().items(Joi.string()),
      baseUrl: Joi.string(),
      httpHeaders: Joi.array().items(
        Joi.object({
          url: Joi.array().items(Joi.string().uri()).required(),
          headers: Joi.object().pattern(Joi.string(), Joi.string()).required(),
        })
      ),
      aliveStatusCodes: Joi.array().items(Joi.number()),
      ignorePatterns: Joi.array().items(
        Joi.object({
          pattern: Joi.string().required(),
        })
      ),
      replacementPatterns: Joi.array().items(
        Joi.object({
          pattern: Joi.string().required(),
          replacement: Joi.string().required(),
        })
      ),
      //outputFormat: Joi.string(),
      //outputVerbosity: Joi.number().integer().min(1).max(5),
      //showErrorsOnly: Joi.boolean(),
      useGitIgnore: Joi.boolean(),
      modifiedFilesOnly: Joi.boolean(),
      followRedirects: Joi.boolean().default(true),
    }).or('files', 'dirs')

    // Validate the config against the schema
    const { error } = schema.validate(config)
    if (error) {
      throw new ValidationError('Incorrect configuration', error.details)
    }
    return true
  } catch (err) {
    if (err instanceof ValidationError) {
      console.error('Validation Error: ', err.message)
      throw err
    } else if (err.message.includes('ENOENT: no such file or directory')) {
      console.error('Error reading file:', err.message)
      throw err
    } else {
      console.error('Other Validation Error: ', err.message)
      throw err
    }
    return false
  }
}

export { validateConfig }
