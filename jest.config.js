module.exports = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^.+\\.css$": "<rootDir>/mocks/styleMock.js",
    "^.+\\.(jpg|jpeg|png|gif|webp)$": "<rootDir>/mocks/fileMock.js"
  },
  setupFilesAfterEnv: ["<rootDir>/setup-tests.js"],
  testPathIgnorePatterns: ["/node_modules/", "/.netlify/"]
};
