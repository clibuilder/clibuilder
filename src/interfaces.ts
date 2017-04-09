export interface Command extends CommandInputs {
  /**
   * Name of the command.
   */
  name: string
  description: string
  alias?: string[]
}
export interface CommandInputs {
  arguments?: CommandArgument[]
  options?: CommandOptions
}
export interface CommandArgument {
    name: string,
    required?: boolean
}

export interface CommandOptions {
  boolean?: {
    /**
     * Name - description
     */
    [optionName: string]: string
  },
  string?: {
    /**
     * Name - description or array of possible values
     */
    [optionName: string]: string | string[]
  }
  alias?: {
    /**
     * Option - array of alias
     */
    [optionName: string]: string[]
  },
  default?: {
    [optionName: string]: string
  }
}
