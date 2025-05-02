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
      const res = await fetch('MissingPersonsManagement.json');
      const contractData = await res.json();
  
      App.contracts.MissingPersonsManagement = TruffleContract(contractData);
      App.contracts.MissingPersonsManagement.setProvider(App.webProvider);
      App.instance = await App.contracts.MissingPersonsManagement.deployed();
  
      App.bindEvents();
      await App.loadMissingPersons(); 
      // ✅ Load data after contract is ready
      await App.populateInvestigatorDropdown();
  
    },
  
    bindEvents: function () {
      document.getElementById('registrationForm').addEventListener('submit', App.handleRegisterUser);
  
      document.getElementById('missingPersonForm')?.addEventListener('submit', App.handleAddMissingPerson);
  
      document.getElementById('updateStatusForm')?.addEventListener('submit', App.handleUpdateStatus);
  
      document.getElementById('connectWalletBtn')?.addEventListener('click', App.connectWallet);
  
  
  
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
          } 
          // Show update status form only for Admins        
  
          if (roleId == 1) {
            const statusSection = document.getElementById('updateStatusSection');
            if (statusSection) statusSection.style.display = 'block';
          }
          
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
    populateInvestigatorDropdown: async function() {
      const  InvestigatorDropdown = document.getElementById('InvestigatorSelect');
      InvestigatorDropdown.innerHTML = '';
      const noneOption = document.createElement('option');
      noneOption.value = '';
      noneOption.text = 'None';
      InvestigatorDropdown.appendChild(noneOption);
      try {
          const instance = await App.contracts.MissingPersonsManagement.deployed();
          const InvestigatorCount = await instance.InvestigatorCount();
          for (let i = 0; i < InvestigatorCount; i++) {
              const  InvestigatorAddress = await instance.InvestigatorAddresses(i);
              const Investigator = await instance.Investigators(InvestigatorAddress);
              const option = document.createElement('option');
              option.value =  InvestigatorAddress;
              option.text = Investigator[1];
              InvestigatorDropdown.appendChild(option);
          }
      } catch (error) {
          console.error("Error populating doctor dropdown:", error);
      }
  },
  
    viewAllSchedules: async function() {
      const instance = await App.contracts.MissingPersonsManagement.deployed();
      try {
          const table = document.getElementById('scheduleTable');
          table.innerHTML = ""; // Clear the table content
          const headerRow = table.insertRow();
          const headerInvestigator = headerRow.insertCell(0);
          headerInvestigator.innerText = "Investigator Name";
          const timeSlots = [
              "4:00 PM - 4:10 PM", "4:10 PM - 4:20 PM", "4:20 PM - 4:30 PM", 
              "4:30 PM - 4:40 PM", "4:40 PM - 4:50 PM", "4:50 PM - 5:00 PM"
          ];
          timeSlots.forEach(slot => {
              const headerCell = headerRow.insertCell(-1);
              headerCell.innerText = slot;
          });
          const InvestigatorCount = await instance.InvestigatorCount();
          for (let i = 0; i < InvestigatorCount; i++) {
              const  InvestigatorAddress = await instance.InvestigatorAddresses(i); 
              const Investigator = await instance.Investigators(InvestigatorAddress); 
              const schedule = await instance.viewAppointmentSchedule(InvestigatorAddress, { from: App.account });
              const row = table.insertRow();
              const  InvestigatorNameCell = row.insertCell(0);
              InvestigatorNameCell.innerText = Investigator[1]; 
              schedule.forEach(isBooked => {
                  const cell = row.insertCell(-1);
                  cell.innerText = isBooked ? "Booked" : "Available";
                  cell.style.color = isBooked ? "red" : "green";
              });
          }
      } catch (err) {
          console.error(err);
          alert(`Error: ${App.extractErrorMessage(err)}`);
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