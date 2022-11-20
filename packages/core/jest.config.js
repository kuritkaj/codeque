const { pathsToModuleNameMapper } = require('ts-jest')
const fs = require('fs')

const tsConfig = JSON.parse(
  fs
    .readFileSync(__dirname + '/tsconfig.json')
    .toString()
    .replace(/^(\s)*\/\//gm, '')
    .replace(/\/\*.+?\*\//gm, ''),
)

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: pathsToModuleNameMapper(tsConfig.compilerOptions.paths, {
    prefix: '<rootDir>',
  }),
  testPathIgnorePatterns: ['__fixtures__', 'ts-dist'],
  setupFiles: ['./jest.setup.js'],
}
