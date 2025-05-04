App = {
  webProvider: null,
  contracts: {},
  account: '0x0',
  web3: null,

  // init: async function () {
  //   if (window.ethereum) {
  //     App.webProvider = window.ethereum;
  //     try {
  //       //await window.ethereum.request({ method: 'eth_requestAccounts' });
  //       const accounts = await App.webProvider.request({ method: 'eth_accounts' });
  //       App.account = accounts[0];
  //       document.getElementById('accountAddress').innerText = `Current Account: ${App.account}`;
  //       App.web3 = new Web3(App.webProvider);
  //       App.listenForAccountChanges();
  //       await App.initContract();
  //       await App.checkUserRole();
  //     } catch (error) {
  //       console.error("Registration error:", error);
  //       const reason = error?.data?.message || error.message || "Unknown error";
  //       document.getElementById("registerMessage").className = "alert alert-danger";
  //       document.getElementById("registerMessage").innerText = `Registration failed: ${reason}`;
  //     }
  //   } else {
  //     alert('Please install MetaMask!');
  //     document.getElementById('accountAddress').innerText = "MetaMask not found.";
  //   }
  // },
  init: async function () {
    if (window.ethereum) {
      App.webProvider = window.ethereum;
      App.web3 = new Web3(App.webProvider);
      App.listenForAccountChanges();
      App.bindEvents(); // So it listens for the connectWallet button
    } else {
      alert('Please install MetaMask!');
      document.getElementById('accountAddress').innerText = "MetaMask not found.";
    }
  },
  

  initContract: async function () {
    const contractData = await res.json();

    App.contracts.MissingPersonsManagement = TruffleContract(contractData);
    App.contracts.MissingPersonsManagement.setProvider(App.webProvider);
    App.instance = await App.contracts.MissingPersonsManagement.deployed();

    App.bindEvents();
    await App.loadMissingPersons(); // ✅ Load data after contract is ready

  },


  connectWallet: async function () {
    try {
      const accounts = await App.webProvider.request({ method: 'eth_requestAccounts' });
      App.account = accounts[0];
      document.getElementById('accountAddress').innerText = `Current Account: ${App.account}`;
      await App.initContract();
      await App.checkUserRole();
    } catch (error) {
      console.error("Connection error:", error);
      const reason = error?.data?.message || error.message || "Unknown error";
      document.getElementById("registerMessage").className = "alert alert-danger";
      document.getElementById("registerMessage").innerText = `Connection failed: ${reason}`;
    }
  },
  
  
  handleRegisterUser: async function (e) {
    e.preventDefault();
  
    const role = parseInt(document.getElementById("role").value);
    const nid = document.getElementById("nid").value;
    const name = document.getElementById("name").value;
  
    try {
      const isRegistered = await App.instance.isRegistered(App.account);
      if (isRegistered) {
        document.getElementById("registerMessage").className = "alert alert-warning";
        document.getElementById("registerMessage").innerText = "You are already registered.";
        return;
      }
  
      await App.instance.registerUser(nid, name, role, { from: App.account });
  
      document.getElementById("registerMessage").className = "alert alert-success";
      document.getElementById("registerMessage").innerText = "Registration successful!";
      document.getElementById("registrationForm").reset();
  
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Registration error:", error);
      const reason = error?.data?.message || error.message || "Unknown error";
      document.getElementById("registerMessage").className = "alert alert-danger";
      document.getElementById("registerMessage").innerText = `Registration failed: ${reason}`;
    }
  },
  

  // new
  handleAddMissingPerson: async function (e) {
    e.preventDefault();
  
    const name = document.getElementById("mpName").value;
    const age = parseInt(document.getElementById("mpAge").value);
    const height = parseInt(document.getElementById("mpHeight").value);
    const description = document.getElementById("mpDescription").value;
    const lastSeenLocation = document.getElementById("mpLastSeenLocation").value;
    const relativeContact = document.getElementById("mpRelativeContact").value;
  
    // Optional: Validate fields
    if (!name || isNaN(age) || isNaN(height) || !description || !lastSeenLocation || !relativeContact) {
      document.getElementById("mpMessage").className = "alert alert-danger";
      document.getElementById("mpMessage").innerText = "Please fill in all fields correctly.";
      return;
    }
  
    try {
      await App.instance.addMissingPerson(
        name,
        age,
        height,
        description,
        lastSeenLocation,
        relativeContact,
        { from: App.account }
      );
  
      document.getElementById("mpMessage").className = "alert alert-success";
      document.getElementById("mpMessage").innerText = "Missing person reported successfully!";
      document.getElementById("missingPersonForm").reset();
    } catch (err) {
      console.error("Error reporting missing person:", err);
      document.getElementById("mpMessage").className = "alert alert-danger";
      document.getElementById("mpMessage").innerText = "Failed to report missing person.";
    }
  },  

  checkUserRole: async function () {
    try {
      const roleId = await App.instance.getMyRoleUint({ from: App.account });
      const roleName = roleId == 1 ? "Admin" : roleId == 2 ? "Reporter" : roleId == 3 ? "Investigator" : null;

      if (roleName) {
        document.getElementById('registrationForm').style.display = 'none';
        const roleDisplay = document.createElement('div');
        roleDisplay.className = 'alert alert-success mt-4';
        roleDisplay.innerHTML = `<strong>You are registered as:</strong> ${roleName}`;
        document.querySelector('.card').appendChild(roleDisplay);

        // Show add missing person form only for Reporters
        if (roleId == 2) {
          const mpSection = document.getElementById('missingPersonSection');
          if (mpSection) mpSection.style.display = 'block';
          const bookappsection=document.getElementById('bookInvestigator');
          if (bookappsection) bookappsection.style.display='block';
        } 
        // Show update status form only for Admins        

        if (roleId == 1) {
          const statusSection = document.getElementById('updateStatusSection');
          if (statusSection) statusSection.style.display = 'block';
          const assignSection = document.getElementById('assignInvestigatorSection');
          if (assignSection) assignSection.style.display = 'block';
        }
        const appointmentSchedule = document.getElementById('appointmentScheduleSection');
        if (appointmentSchedule) appointmentSchedule.style.display = 'block';
        
      }
    } catch (err) {
      console.log("User not registered yet.");
    }
  },

  listenForAccountChanges: function () {
    window.ethereum.on('accountsChanged', function (accounts) {
      if (accounts.length > 0) {
        App.account = accounts[0];
        document.getElementById('accountAddress').innerText = `Current Account: ${App.account}`;
        window.location.reload(); // Re-initialize role check
      } else {
        document.getElementById('accountAddress').innerText = 'No Account Connected';
      }
    });
  },

  loadMissingPersons: async function () {
    try {
      const result = await App.instance.getAllMissingPersons({ from: App.account });
  
      const ids = result[0];
      const names = result[1];
      const ages = result[2];
      const heights = result[3];
      const descriptions = result[4];
      const lastSeenLocations = result[5];
      const relativeContacts = result[6];
      const statuses = result[7];
      const investigators = result[8]; 
      const list = document.getElementById("missingPersonsList");
      list.innerHTML = "";
  
      const roleId = await App.instance.getMyRoleUint({ from: App.account });
  
      for (let i = 0; i < ids.length; i++) {
        const div = document.createElement("div");
        div.className = "card mb-3 p-3";
  
        let html = `
          <h5>#${ids[i]} - ${names[i]}</h5>
          <p><strong>Age:</strong> ${ages[i]}</p>
          <p><strong>Height:</strong> ${heights[i]}</p>
          <p><strong>Description:</strong> ${descriptions[i]}</p>
          <p><strong>Last Seen:</strong> ${lastSeenLocations[i]}</p>
          <p><strong>Contact:</strong> ${relativeContacts[i]}</p>
          <p><strong>Status:</strong> ${statuses[i]}</p>
           <p>Investigator: ${investigators[i]}</p>
        `;
  
        if (roleId == 1 && statuses[i] !== "found") {
          html += `
            <form onsubmit="App.handleInlineUpdateStatus(event, ${ids[i]})">
              <input type="text" id="inlineStatus-${ids[i]}" placeholder="Enter new status" class="form-control mb-2" required>
              <button type="submit" class="btn btn-primary btn-sm">Update Status</button>
            </form>
          `;
        }
  
        div.innerHTML = html;
        list.appendChild(div);
      }
  
    } catch (err) {
      console.error("Error loading missing persons:", err);
    }
  },
  viewAllSchedules: async function () {
    try {
      const total = await App.instance.getTotalAppointments();
      const table = document.getElementById('scheduleTable');
      table.innerHTML = ''; // Clear existing
  
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Case ID</th>
          <th>Reporter</th>
          <th>Investigator</th>
          <th>Date</th>
          <th>Status</th>
        </tr>`;
      table.appendChild(thead);
  
      const tbody = document.createElement('tbody');
  
      for (let i = 0; i < total; i++) {
        const [caseId, reporter, investigator, date, status] = await App.instance.getAppointmentByIndex(i);
  
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${caseId}</td>
          <td>${reporter}</td>
          <td>${investigator}</td>
          <td>${date}</td>
          <td>${status}</td>`;
        tbody.appendChild(row);
      }
  
      table.appendChild(tbody);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  },

  handleAssignInvestigator: async function (e) {
    e.preventDefault();
    const caseId = parseInt(document.getElementById("assignCaseId").value);
    const investigatorAddress = document.getElementById("assignInvestigatorAddress").value;
  
    if (isNaN(caseId) || !investigatorAddress) {
      document.getElementById("assignMessage").className = "alert alert-danger";
      document.getElementById("assignMessage").innerText = "Please enter valid Case ID and Investigator address.";
      return;
    }
  
    try {
      await App.instance.assignInvestigator(caseId, investigatorAddress, { from: App.account });
  
      document.getElementById("assignMessage").className = "alert alert-success";
      document.getElementById("assignMessage").innerText = "Investigator assigned successfully!";
      document.getElementById("assignForm").reset();
    } catch (err) {
      console.error("Error assigning investigator:", err);
      document.getElementById("assignMessage").className = "alert alert-danger";
      document.getElementById("assignMessage").innerText = "Failed to assign investigator.";
    }
  },
  
  
  

  handleUpdateStatus: async function (e) {
    e.preventDefault();

    const serialNumber = parseInt(document.getElementById("updateSerial").value);
    const newStatus = document.getElementById("updateStatus").value.trim();

    try {
      await App.instance.updateMissingPersonStatus(serialNumber, newStatus, { from: App.account });

      document.getElementById("updateStatusMessage").className = "alert alert-success";
      document.getElementById("updateStatusMessage").innerText = "Status updated successfully!";
      document.getElementById("updateStatusForm").reset();
    } catch (err) {
      console.error("Update failed:", err);
      document.getElementById("updateStatusMessage").className = "alert alert-danger";
      document.getElementById("updateStatusMessage").innerText = "Failed to update status. Only 'found' is valid and can be updated once.";
    }
  }
};


window.addEventListener('load', function () {
  App.init();
});
