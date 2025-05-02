// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract MissingPersonsManagement {

    enum Role { None, Admin, Reporter, Investigator }

    struct User {
        string nid;
        string name;
        Role role;
        address addr;
    }
    address public owner;
    mapping(address => User) public users;

    event UserRegistered(address indexed user, string message, string roleName);

    struct MissingPerson {
    uint serialNumber;
    string name;
    uint age;
    uint height;
    string status; // "missing" or "found"
    string description;
    string lastSeenLocation; // division
    string relativeContact;
    string urgency;
    address reporter;
    address assignedInvestigator;

}

event InvestigatorAssigned(uint serialNumber, address investigator);

uint public missingPersonCount = 0;
mapping(uint => MissingPerson) public missingPersons;

event MissingPersonAdded(uint serialNumber, string name, string urgency, address reporter);

    constructor() {
    owner = msg.sender;
    // Deployer starts unregistered (Role.None)
}


    modifier onlyUnregistered() {
        require(users[msg.sender].role == Role.None, "User already registered");
        _;
    }

    function registerUser(string memory nid, string memory name, Role role) public onlyUnregistered {
        require(uint(role) > 0 && uint(role) <= 3, "Invalid role"); // Role must not be None
        users[msg.sender] = User(nid, name, role, msg.sender);

        string memory roleName = getRoleName(role);
        emit UserRegistered(msg.sender, "Registration successful", roleName);
    }

    function getRoleName(Role role) internal pure returns (string memory) {
        if (role == Role.Admin) return "Admin";
        if (role == Role.Reporter) return "Reporter";
        if (role == Role.Investigator) return "Investigator";
        return "None";
    }

    function getMyRole() public view returns (Role) {
        return users[msg.sender].role;
    }

    function getMyRoleUint() public view returns (uint) {
        return uint(users[msg.sender].role);
    }

    function getUser(address userAddr) public view returns (string memory, string memory, Role, address) {
        User memory user = users[userAddr];
        return (user.nid, user.name, user.role, user.addr);
    }

    function isRegistered(address userAddr) public view returns (bool) {
        return users[userAddr].role != Role.None;
    }
function addMissingPerson(
    string memory name,
    uint age,
    uint height,
    string memory description,
    string memory lastSeenLocation,
    string memory relativeContact
) public {
    require(users[msg.sender].role == Role.Reporter, "Only reporters can add missing persons");

    string memory urgency;
    if (age < 18) {
        urgency = "High";
    } else if (age > 50) {
        urgency = "Medium";
    } else {
        urgency = "Low";
    }

    missingPersonCount++;
    missingPersons[missingPersonCount] = MissingPerson(
        missingPersonCount,
        name,
        age,
        height,
        "missing",  // status
        description,
        lastSeenLocation,
        relativeContact,
        urgency,
        msg.sender,  // reporter
        address(0)   // assigned investigator (not assigned yet)
    );

    emit MissingPersonAdded(missingPersonCount, name, urgency, msg.sender);
}


function getMissingPerson(uint serialNumber) public view returns (string memory, uint, string memory, string memory, address) {
    MissingPerson memory mp = missingPersons[serialNumber];
    return (mp.name, mp.age, mp.description, mp.urgency, mp.reporter);
}

function updateMissingPersonStatus(uint serialNumber, string memory newStatus) public {
    require(users[msg.sender].role == Role.Admin, "Only Admin can update status");

    MissingPerson storage person = missingPersons[serialNumber];
    require(bytes(person.name).length != 0, "Missing person not found");
    require(keccak256(bytes(person.status)) != keccak256(bytes("found")), "Status already marked as found");

    // Only allow "found" as valid update
    require(
        keccak256(bytes(newStatus)) == keccak256(bytes("found")),
        "Invalid status update. Only 'found' is allowed."
    );

    person.status = newStatus;
}
function getAllMissingPersons() public view returns (
    uint[] memory ids,
    string[] memory names,
    uint[] memory ages,
    uint[] memory heights,
    string[] memory descriptions,
    string[] memory lastSeenLocations,
    string[] memory relativeContacts,
    string[] memory statuses,
    address[] memory investigators
) {
    uint count = missingPersonCount;
    ids = new uint[](count);
    names = new string[](count);
    ages = new uint[](count);
    heights = new uint[](count);
    descriptions = new string[](count);
    lastSeenLocations = new string[](count);
    relativeContacts = new string[](count);
    statuses = new string[](count);
    investigators = new address[](count);  // Initialize an array to store investigator addresses

    for (uint i = 0; i < count; i++) {
        uint serial = i + 1;
        MissingPerson storage p = missingPersons[serial];
        ids[i] = p.serialNumber;
        names[i] = p.name;
        ages[i] = p.age;
        heights[i] = p.height;
        descriptions[i] = p.description;
        lastSeenLocations[i] = p.lastSeenLocation;
        relativeContacts[i] = p.relativeContact;
        statuses[i] = p.status;
        investigators[i] = p.assignedInvestigator;  // Add the investigator address
    }
}

function assignInvestigator(uint caseId, address investigator) public {
    require(users[msg.sender].role == Role.Admin, "Only admin can assign investigators");
    require(users[investigator].role == Role.Investigator, "Must assign to a valid Investigator");
    require(caseId > 0 && caseId <= missingPersonCount, "Invalid case ID");

    missingPersons[caseId].assignedInvestigator = investigator;
    emit InvestigatorAssigned(caseId, investigator);
}


}