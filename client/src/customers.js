import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./customers.css";

function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const rowsPerPage = 50;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetch("http://localhost:5001/customers")
            .then((response) => response.json())
            .then((data) => {
                setCustomers(data.sort((a, b) => a.customer_id - b.customer_id));
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching customers:", error);
                setLoading(false);
            });
    }, []);

    const totalPages = Math.ceil(customers.length / rowsPerPage);
    const paginatedCustomers = customers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="customers-container">
            <h1 className="title">👤 Customers</h1>
            <Link to="/">
                <button className="btn home-btn">🏠 Home</button>
            </Link>

            {loading ? (
                <p>Loading customers...</p>
            ) : (
                <>
                    <table className="customers-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCustomers.map(customer => (
                                <tr key={customer.customer_id}>
                                    <td>{customer.customer_id}</td>
                                    <td>{customer.name}</td>
                                    <td>{customer.email}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="pagination">
                        <button className="btn" onClick={prevPage} disabled={currentPage === 1}>⬅ Previous</button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button className="btn" onClick={nextPage} disabled={currentPage === totalPages}>Next ➡</button>
                    </div>
                </>
            )}
        </div>
    );
}

export default CustomersPage;
