const MissingPersonsManagement = artifacts.require("MissingPersonsManagement");

module.exports = function (deployer) {
  deployer.deploy(MissingPersonsManagement);
};
