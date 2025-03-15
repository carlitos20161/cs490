import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./customers.css";

function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchCategory, setSearchCategory] = useState("id");
    const [currentPage, setCurrentPage] = useState(1);
    const [newCustomer, setNewCustomer] = useState({ firstName: "", lastName: "", email: "" });
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const rowsPerPage = 50;
    const [menuCustomer, setMenuCustomer] = useState(null);
    const [editCustomer, setEditCustomer] = useState({ firstName: "", lastName: "", email: "" });
    const [customerRentals, setCustomerRentals] = useState([]);

    useEffect(() => {
        if (searchQuery.trim()) {
            handleSearch();
        } else {
            fetchCustomers(); // Fetch all customers if search is cleared
        }
    }, [searchQuery, searchCategory]);
    

    const fetchCustomers = async () => {
        try {
            const response = await fetch("http://localhost:5001/customers");
            const data = await response.json();
            setCustomers(data.sort((a, b) => a.customer_id - b.customer_id));
            setFilteredCustomers(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching customers:", error);
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            fetchCustomers();
            return;
        }
    
        try {
            const response = await fetch(`http://localhost:5001/customers?query=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(searchCategory)}`);
            const data = await response.json();
            setFilteredCustomers(data);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching filtered customers:", error);
        }
    };
    
    const handleAddCustomer = async () => {
        if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email) {
            alert("All fields are required!");
            return;
        }
    
        try {
            const response = await fetch("http://localhost:5001/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCustomer),
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.error || "Failed to add customer");
            }
    
            alert("Customer added successfully!");
            setNewCustomer({ firstName: "", lastName: "", email: "" }); 
            fetchCustomers(); 
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("Error adding customer.");
        }
    };
    
    const fetchCustomerRentals = async (customerId) => {
        try {
            console.log(`Fetching rental history for customer: ${customerId}`); 
            const response = await fetch(`http://localhost:5001/customer/${customerId}/rental-history`);
            const data = await response.json();
    
            console.log("Rental History:", data);  
            
            setCustomerRentals(data); 
        } catch (error) {
            console.error("Error fetching customer rentals:", error);
        }
    };

    const handleDeleteCustomer = async () => {
        if (!window.confirm(`Are you sure you want to delete ${menuCustomer.first_name} ${menuCustomer.last_name}?`)) return;

        try {
            const response = await fetch(`http://localhost:5001/customers/${menuCustomer.customer_id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete customer");
            }

            alert("Customer deleted successfully!");
            setMenuCustomer(null);
            fetchCustomers();
        } catch (error) {
            console.error("Error deleting customer:", error);
            alert("Error deleting customer.");
        }
    };

    const handleMenuOpen = (customer, event) => {
        setMenuCustomer(customer);
        setEditCustomer({
            firstName: customer.first_name,
            lastName: customer.last_name,
            email: customer.email,
        });
        fetchCustomerRentals(customer.customer_id);
    };

    const handleReturnRental = async (rentalId) => {
        if (!window.confirm("Are you sure you want to return this rental?")) return;
    
        try {
            const response = await fetch(`http://localhost:5001/rental/${rentalId}/return`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
            });
    
            if (!response.ok) {
                throw new Error("Failed to return rental");
            }
    
            alert("Rental returned successfully!");
            fetchCustomerRentals(menuCustomer.customer_id);  
        } catch (error) {
            console.error("Error returning rental:", error);
            alert("Error returning rental.");
        }
    };
    

    const handleSaveChanges = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`http://localhost:5001/customers/${menuCustomer.customer_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editCustomer),
            });

            if (!response.ok) {
                throw new Error("Failed to update customer");
            }

            alert("Customer updated successfully!");
            setMenuCustomer(null);
            fetchCustomers();
        } catch (error) {
            console.error("Error updating customer:", error);
            alert("Error updating customer.");
        }
    };

    const handleCloseMenu = () => {
        setMenuCustomer(null);
    };

    const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        
            <div className="customers-container">
               <h1 className="title">👤 Customers</h1>

<Link to="/">
    <button className="btn home-btn">🏠 Home</button>
</Link>

<button className="btn add-customer-toggle-btn" onClick={() => setShowForm(!showForm)}>
    {showForm ? "❌ Cancel" : "➕ Add a Customer"}
</button>

{showForm && (
    <div className="add-customer-form">
        <input
            type="text"
            placeholder="First Name"
            value={newCustomer.firstName}
            onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
            required
        />
        <input
            type="text"
            placeholder="Last Name"
            value={newCustomer.lastName}
            onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
            required
        />
        <input
            type="email"
            placeholder="Email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            required
        />
        <button className="btn add-customer-btn" onClick={handleAddCustomer}> Add Customer</button>
    </div>
)}


<div className="search-container">
    <select className="search-dropdown" value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)}>
        <option value="id">ID</option>
        <option value="firstName">First Name</option>
        <option value="lastName">Last Name</option>
    </select>
    <input 
        type="text" 
        className="search-input"
        placeholder={`Search by ${searchCategory}`} 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)}
    />
</div>



        <table className="customers-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>Active Rentals</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {paginatedCustomers.map(customer => (
                    <tr key={customer.customer_id}>
                        <td>{customer.customer_id}</td>
                        <td>{customer.first_name}</td>
                        <td>{customer.last_name}</td>
                        <td>{customer.email}</td>
                        <td>{customer.rentals}</td>
                        <td>
                            <button className="btn action-btn" onClick={(e) => handleMenuOpen(customer, e)}>Info</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>

        {menuCustomer && (
            <div className="floating-menu">
                <h3>Edit Customer</h3>
                <form onSubmit={handleSaveChanges}>
                    <div className="name-container">
                        <label>First Name:</label>
                        <input
                            type="text"
                            value={editCustomer.firstName}
                            onChange={(e) => setEditCustomer({ ...editCustomer, firstName: e.target.value })}
                            required
                        />
                        <label>Last Name:</label>
                        <input
                            type="text"
                            value={editCustomer.lastName}
                            onChange={(e) => setEditCustomer({ ...editCustomer, lastName: e.target.value })}
                            required
                        />
                    </div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={editCustomer.email}
                        onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                        required
                    />
                    <div className="button-container">
                        <button type="submit" className="btn save-btn">💾 Save Changes </button>
                        <button type="button" className="btn delete-btn" onClick={handleDeleteCustomer}>❌ Delete </button>
                        <button type="button" className="btn close-btn" onClick={handleCloseMenu}> Cancel</button>
                    </div>
                </form>
                <h3></h3>
                <h3>Active Rentals</h3>
                <table className="rented-movies-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Rental Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customerRentals.activeRentals?.length > 0 ? (
                            customerRentals.activeRentals.map((rental) => (
                                <tr key={rental.rental_id}>
                                    <td>{rental.title}</td>
                                    <td>{rental.rental_date}</td>
                                    <td>
                                        <button className="btn delete-btn" onClick={() => handleReturnRental(rental.rental_id)}>
                                            ❌ Return
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="3">No active rentals</td></tr>
                        )}
                    </tbody>
                </table>

                <h3>Rental History</h3>
                <table className="rented-movies-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Rental Date</th>
                            <th>Return Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customerRentals.pastRentals?.length > 0 ? (
                            customerRentals.pastRentals.map((rental) => (
                                <tr key={rental.rental_id}>
                                    <td>{rental.title}</td>
                                    <td>{rental.rental_date}</td>
                                    <td>{rental.return_date}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="3">No past rentals</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

        <div className="pagination">
            <button className="btn" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                ⬅ Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button className="btn" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                Next ➡
            </button>
        </div>
    </div>
    
);

}

export default CustomersPage;
