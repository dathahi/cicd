// API URL
const API_URL = "http://localhost:3000/v1/items";

// DOM elements
const taskInput = document.getElementById("new-task");
const addButton = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");
const loadingElement = document.getElementById("loading");
const taskDetailsContainer = document.getElementById("task-details");
const closeDetailsButton = document.getElementById("close-details");

// Event listeners
addButton.addEventListener("click", addTask);
taskInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        addTask();
    }
});
if (closeDetailsButton) {
    closeDetailsButton.addEventListener("click", closeTaskDetails);
}

// Load tasks when page loads
document.addEventListener("DOMContentLoaded", fetchTasks);

// Fetch all tasks from API
async function fetchTasks() {
    console.log("Gọi API tại:", API_URL);
    showLoading(true);
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error("Không thể kết nối đến máy chủ");
        }
        
        const data = await response.json();
        console.log("Dữ liệu nhận được:", data);
        renderTasks(data.data || []);
    } catch (error) {
        showError("Lỗi khi tải danh sách công việc: " + error.message);
    } finally {
        showLoading(false);
    }
}

// Add a new task
async function addTask() {
    const description = taskInput.value.trim();
    if (!description) return;
    
    showLoading(true);
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                description: description,
                completed: false
            })
        });
        
        if (!response.ok) {
            throw new Error("Không thể thêm công việc");
        }
        
        const data = await response.json();
        
        // Add the new task to the list
        const newTask = {
            id: data.data,
            description: description,
            completed: false
        };
        
        addTaskToDOM(newTask);
        taskInput.value = "";
        showMessage("Đã thêm công việc mới", "success");
    } catch (error) {
        showError("Lỗi khi thêm công việc: " + error.message);
    } finally {
        showLoading(false);
    }
}

// Get a single task by ID
async function getTaskById(id) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            throw new Error("Không thể lấy thông tin công việc");
        }
        
        const data = await response.json();
        showTaskDetails(data.data);
    } catch (error) {
        showError("Lỗi khi lấy thông tin công việc: " + error.message);
    } finally {
        showLoading(false);
    }
}

// Show task details
function showTaskDetails(task) {
    if (!taskDetailsContainer) return;
    
    taskDetailsContainer.innerHTML = `
        <div class="task-details-content">
            <h2>Chi tiết công việc</h2>
            <p><strong>ID:</strong> ${task.id}</p>
            <p><strong>Mô tả:</strong> ${escapeHtml(task.description)}</p>
            <p><strong>Trạng thái:</strong> ${task.completed ? "Đã hoàn thành" : "Chưa hoàn thành"}</p>
            <div class="task-details-actions">
                <button id="toggle-status-btn" class="action-btn ${task.completed ? 'completed' : ''}">
                    ${task.completed ? "Đánh dấu chưa hoàn thành" : "Đánh dấu đã hoàn thành"}
                </button>
                <button id="delete-task-btn" class="action-btn delete">Xóa công việc</button>
            </div>
            <button id="close-details" class="close-btn">Đóng</button>
        </div>
    `;
    
    taskDetailsContainer.style.display = "block";
    
    // Add event listeners
    document.getElementById("toggle-status-btn").addEventListener("click", () => {
        toggleCompleted(task.id, task.completed);
        closeTaskDetails();
    });
    
    document.getElementById("delete-task-btn").addEventListener("click", () => {
        deleteTask(task.id);
        closeTaskDetails();
    });
    
    document.getElementById("close-details").addEventListener("click", closeTaskDetails);
}

// Close task details
function closeTaskDetails() {
    if (taskDetailsContainer) {
        taskDetailsContainer.style.display = "none";
    }
}

// Toggle task completion status
async function toggleCompleted(id, currentStatus) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                completed: !currentStatus
            })
        });
        
        if (!response.ok) {
            throw new Error("Không thể cập nhật trạng thái");
        }
        
        // Update the task element in the DOM
        const taskElement = document.getElementById(`task-${id}`);
        if (taskElement) {
            if (!currentStatus) {
                taskElement.classList.add("completed");
            } else {
                taskElement.classList.remove("completed");
            }
            
            // Update the checkbox
            const checkbox = taskElement.querySelector(".checkbox");
            checkbox.checked = !currentStatus;
        }
        
        showMessage(`Đã ${!currentStatus ? "hoàn thành" : "chưa hoàn thành"} công việc`, "success");
    } catch (error) {
        showError("Lỗi khi cập nhật trạng thái: " + error.message);
    }
}

// Delete a task
async function deleteTask(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });
        
        if (!response.ok) {
            throw new Error("Không thể xóa công việc");
        }
        
        // Remove the task element from the DOM
        const taskElement = document.getElementById(`task-${id}`);
        if (taskElement) {
            taskElement.remove();
        }
        
        showMessage("Đã xóa công việc", "success");
        
        // Check if the list is empty
        if (taskList.children.length === 0) {
            showEmptyList();
        }
    } catch (error) {
        showError("Lỗi khi xóa công việc: " + error.message);
    }
}

// Render all tasks
function renderTasks(tasks) {
    // Clear task list (except loading element)
    while (taskList.firstChild) {
        taskList.removeChild(taskList.firstChild);
    }
    
    if (tasks.length === 0) {
        showEmptyList();
        return;
    }
    const formattedTasks = tasks.map(task => {
        return {
            id: task.id, // hoặc task.task_id, tùy thuộc vào cấu trúc dữ liệu của API
            description: task.description, // hoặc task.task_description
            completed: task.completed // hoặc task.is_completed
        };
    });
    
    // Add each task to the DOM
    tasks.forEach(task => {
        addTaskToDOM(task);
    });
}

// Add a single task to the DOM
function addTaskToDOM(task) {
    const emptyElement = document.querySelector(".empty-list");
    if (emptyElement) {
        emptyElement.remove();
    }
    
    const taskElement = document.createElement("div");
    taskElement.id = `task-${task.id}`;
    taskElement.className = `task ${task.completed ? "completed" : ""}`;
    
    taskElement.innerHTML = `
        <div class="task-content">
            <input type="checkbox" class="checkbox" ${task.completed ? "checked" : ""}>
            <span class="task-text">${escapeHtml(task.description)}</span>
        </div>
        <div class="task-actions">
            <button class="view-btn">Xem</button>
            <button class="delete-btn">Xóa</button>
        </div>
    `;
    
    // Add event listeners
    const checkbox = taskElement.querySelector(".checkbox");
    checkbox.addEventListener("change", () => {
        toggleCompleted(task.id, checkbox.checked);
    });
    
    const viewButton = taskElement.querySelector(".view-btn");
    viewButton.addEventListener("click", () => {
        getTaskById(task.id);
    });
    
    const deleteButton = taskElement.querySelector(".delete-btn");
    deleteButton.addEventListener("click", () => {
        deleteTask(task.id);
    });
    
    taskList.appendChild(taskElement);
}

// Show loading state
function showLoading(isLoading) {
    if (isLoading) {
        loadingElement.style.display = "block";
    } else {
        loadingElement.style.display = "none";
    }
}

// Show empty list message
function showEmptyList() {
    const emptyElement = document.createElement("div");
    emptyElement.className = "empty-list";
    emptyElement.textContent = "Chưa có công việc nào";
    taskList.appendChild(emptyElement);
}

// Show error message
function showError(message) {
    statusMessage.textContent = message;
    statusMessage.className = "message error";
    setTimeout(() => {
        statusMessage.style.display = "none";
    }, 5000);
}

// Show success message
function showMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `message ${type}`;
    setTimeout(() => {
        statusMessage.style.display = "none";
    }, 3000);
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}