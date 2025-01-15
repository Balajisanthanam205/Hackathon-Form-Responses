document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const teamSizeSelect = document.getElementById('teamSize');
    const teamMembersContainer = document.getElementById('teamMembers');
    const submitBtn = document.getElementById('submitBtn');
    const abstractInput = document.getElementById('abstract');
    const selectedFileDiv = document.getElementById('selectedFile');
    const dropZone = document.getElementById('dropZone');

    // Google Apps Script URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwjpCP2FMq6ECwMhHflqJ8eoVGaicD7ljrRr9fsoPsFChK9n4kq7-EC5s80TCgaxYcz/exec';

    // Validation patterns
    const patterns = {
        email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        phone: /^\d{10}$/
    };

    function createMemberFields(index) {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        memberCard.innerHTML = `
            <div class="member-header">
                <div class="member-number">${index + 1}</div>
                <h3>Member ${index + 1}</h3>
            </div>
            <div class="member-grid">
                <div>
                    <label for="name${index}">Name</label>
                    <input type="text" id="name${index}" name="members[${index}].name" required minlength="2">
                    <span class="error" id="nameError${index}"></span>
                </div>
                <div>
                    <label for="email${index}">Email</label>
                    <input type="email" id="email${index}" name="members[${index}].email" required>
                    <span class="error" id="emailError${index}"></span>
                </div>
                <div>
                    <label for="phone${index}">Phone Number</label>
                    <input type="tel" id="phone${index}" name="members[${index}].phone" required>
                    <span class="error" id="phoneError${index}"></span>
                </div>
                <div>
                    <label for="college${index}">College Name</label>
                    <input type="text" id="college${index}" name="members[${index}].college" required minlength="3">
                    <span class="error" id="collegeError${index}"></span>
                </div>
            </div>
        `;
        return memberCard;
    }

    function updateTeamMembers() {
        const size = parseInt(teamSizeSelect.value);
        teamMembersContainer.innerHTML = '';
        for (let i = 0; i < size; i++) {
            teamMembersContainer.appendChild(createMemberFields(i));
        }
        validateForm();
    }

    function validateInput(input, pattern) {
        if (input.required && !input.value) {
            return `${input.previousElementSibling.textContent.trim()} is required`;
        }
        if (input.minLength && input.value.length < input.minLength) {
            return `${input.previousElementSibling.textContent.trim()} must be at least ${input.minLength} characters`;
        }
        if (pattern && !pattern.test(input.value)) {
            return `Invalid ${input.previousElementSibling.textContent.trim().toLowerCase()}`;
        }
        return '';
    }

    function validateForm() {
        let isValid = true;
        const inputs = form.querySelectorAll('input:not([type="file"])');
        
        inputs.forEach(input => {
            const errorElement = input.nextElementSibling;
            let pattern = null;
            
            if (input.type === 'email') pattern = patterns.email;
            if (input.type === 'tel') pattern = patterns.phone;
            
            const error = validateInput(input, pattern);
            if (error) {
                errorElement.textContent = error;
                isValid = false;
            } else {
                errorElement.textContent = '';
            }
        });

        if (!abstractInput.files[0]) {
            document.getElementById('abstractError').textContent = 'Abstract file is required';
            isValid = false;
        }

        submitBtn.disabled = !isValid;
        submitBtn.textContent = isValid ? 'Submit' : 'Please Fill All Required Fields';
    }

    function handleFile(file) {
        if (file) {
            if (file.type !== 'application/pdf') {
                document.getElementById('abstractError').textContent = 'Please upload a PDF file';
                selectedFileDiv.textContent = '';
                selectedFileDiv.className = 'selected-file invalid';
                return false;
            } else if (file.size > 10 * 1024 * 1024) {
                document.getElementById('abstractError').textContent = 'File size must be less than 10MB';
                selectedFileDiv.textContent = '';
                selectedFileDiv.className = 'selected-file invalid';
                return false;
            } else {
                document.getElementById('abstractError').textContent = '';
                selectedFileDiv.textContent = `Selected file: ${file.name}`;
                selectedFileDiv.className = 'selected-file valid';
                return true;
            }
        } else {
            selectedFileDiv.textContent = '';
            selectedFileDiv.className = 'selected-file';
            return false;
        }
    }

    // Event Listeners
    teamSizeSelect.addEventListener('change', updateTeamMembers);
    form.addEventListener('input', validateForm);

    // File Upload Handling
    abstractInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
        validateForm();
    });

    // Drag and Drop Handling
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            // Update the file input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            abstractInput.files = dataTransfer.files;
            
            handleFile(file);
            validateForm();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!submitBtn.disabled) {
            const formData = new FormData(form);
            const file = abstractInput.files[0];
            const payload = {
                teamName: formData.get('teamName'),
                teamSize: parseInt(formData.get('teamSize')),
                members: [],
                problemId: formData.get('problemId'),
                domain: formData.get('domain')
            };

            for (let i = 0; i < payload.teamSize; i++) {
                payload.members.push({
                    name: formData.get(`members[${i}].name`),
                    email: formData.get(`members[${i}].email`),
                    phone: formData.get(`members[${i}].phone`),
                    college: formData.get(`members[${i}].college`)
                });
            }

            try {
                const requestBody = new FormData();
                requestBody.append('payload', JSON.stringify(payload));
                requestBody.append('abstract', file);

                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';

                const response = await fetch(scriptURL, {
                    method: 'POST',
                    body: requestBody
                });

                if (response.ok) {
                    const result = await response.json();
                    alert('Form submitted successfully!');
                    console.log('Google Script Response:', result);
                    form.reset();
                    selectedFileDiv.textContent = '';
                    selectedFileDiv.className = 'selected-file';
                    updateTeamMembers();
                } else {
                    alert('Error submitting form. Please try again later.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error submitting form. Please check your network connection and try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        }
    });

    // Initialize form
    updateTeamMembers();
});