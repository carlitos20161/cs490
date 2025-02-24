import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./movies.css"; 

function MoviesPage() {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 100;

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchCategory, setSearchCategory] = useState("title");
    const [searchPage, setSearchPage] = useState(1);
    const [searchTotalResults, setSearchTotalResults] = useState(0);
    const searchRowsPerPage = 50;

    const [selectedFilm, setSelectedFilm] = useState(null);
    const [customerID, setCustomerID] = useState("");
   

    useEffect(() => {
        fetch("http://localhost:5001/all-movies")
            .then((response) => response.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setMovies(data);
                } else {
                    console.error("🚨 Expected an array but got:", data);
                    setMovies([]);
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching movies:", error);
                setMovies([]);
                setLoading(false);
            });
    }, []);

    const totalPages = Math.ceil(movies.length / rowsPerPage);

    const fetchSearchResults = async (query, page = 1) => {
        try {
            const response = await fetch(`http://localhost:5001/search?query=${query}&category=${searchCategory}&page=${page}&limit=${searchRowsPerPage}`);
            const data = await response.json();
    
            setSearchResults(data.movies);
            setSearchTotalResults(data.total);
            setSearchPage(page);
        } catch (error) {
            console.error("Error searching movies:", error);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        if (query.length > 1) {
            fetchSearchResults(query, 1);
        } else {
            setSearchResults([]);
        }
    };

    const fetchFilmDetails = async (filmId) => {
        try {
            const response = await fetch(`http://localhost:5001/film/${filmId}`);
            const data = await response.json();
    
            if (!data || Object.keys(data).length === 0) {
                alert("No details found for this movie.");
                return;
            }
    
            setSelectedFilm(data);
            console.log("Selected Film Details:", data);
        } catch (error) {
            console.error("Error fetching film details:", error);
        }
    };
    
    const rentFilm = async () => {
        if (!customerID) {
            alert("Please enter a valid Customer ID.");
            return;
        }
    
        try {
            const response = await fetch(`http://localhost:5001/rent-film`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filmId: selectedFilm.film_id, customerId: customerID })
            });
    
            const result = await response.json();
            if (response.ok) {
                alert("Film rented successfully!");
                setCustomerID("");
    
                const updatedResponse = await fetch(`http://localhost:5001/film/${selectedFilm.film_id}`);
                const updatedData = await updatedResponse.json();
    
                setSelectedFilm(updatedData);
            } else {
                alert(result.error || "Failed to rent film.");
            }
        } catch (error) {
            console.error("Error renting film:", error);
            alert("please try again.");
        }
    };
    

    const paginatedMovies = movies.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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

    const nextSearchPage = () => {
        if (searchPage * searchRowsPerPage < searchTotalResults) {
            fetchSearchResults(searchQuery, searchPage + 1);
        }
    };
    
    const prevSearchPage = () => {
        if (searchPage > 1) {
            fetchSearchResults(searchQuery, searchPage - 1);
        }
    };

    return (
        <div className="movies-container">
            <h1 className="title">🎬 All Movies</h1>
            <Link to="/">
                <button className="btn back-btn">⬅ Back to Home</button>
            </Link>

            <div className="search-container">
                <select className="btn back-btn" value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)}>
                    <option value="title">Movie Title</option>
                    <option value="actor">Actor Name</option>
                    <option value="genre">Genre</option>
                </select>

                <input
                    type="text"
                    placeholder={`Search by ${searchCategory}...`}
                    value={searchQuery}
                    onChange={handleSearch}
                    className="search-bar"
                />
               {selectedFilm && (
    <div className="film-details">
        <h2>{selectedFilm.title}</h2>
        <p><strong>Release Year:</strong> {selectedFilm.release_year}</p>
        <p><strong>Description:</strong> {selectedFilm.description}</p>
        <p><strong>Copies Available:</strong> {selectedFilm.copies}</p>

        <div>
            <input
                type="text"
                placeholder="Enter Customer ID"
                value={customerID}
                onChange={(e) => setCustomerID(e.target.value)}
                className="customer-id-input"
            />
            <button className="btn rent-btn" onClick={rentFilm}>Rent This Film</button>
            <button className="btn close-btn" onClick={() => setSelectedFilm(null)}>Close</button>
        </div>
    </div>
)}

            </div>

            {loading ? (
                <p>Loading movies...</p>
            ) : (
                <>
                    {searchQuery.length > 1 ? (
                        
                        <div className="search-results">
                            <h3>🔍 Search Results:</h3>
                            {searchResults.length > 0 ? (
                                <>
                                    <table className="movies-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Title</th>
                                                <th>Category</th>
                                                <th>Language</th>
                                                <th>Release Year</th>
                                                {searchCategory === "actor" && <th>Actor</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map((movie) => (
                                                <tr key={movie.film_id}>
                                                    <td>{movie.film_id}</td>
                                                    <td>
                                            <button 
                                                onClick={() => fetchFilmDetails(movie.film_id)} 
                                                style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "inherit" }}
                                            >
                                                {movie.title}
                                            </button>
                                           </td>
                                                    <td>{movie.category}</td>
                                                    <td>{movie.language}</td>
                                                    <td>{movie.release_year}</td>
                                                    {searchCategory === "actor" && <td>{movie.actor_name}</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="pagination">
                                        <button className="btn" onClick={prevSearchPage} disabled={searchPage === 1}>⬅ Previous</button>
                                        <span>Page {searchPage} of {Math.ceil(searchTotalResults / searchRowsPerPage)}</span>
                                        <button className="btn" onClick={nextSearchPage} disabled={searchPage * searchRowsPerPage >= searchTotalResults}>Next ➡</button>
                                    </div>
                                </>
                            ) : (
                                <p className="no-results">No results found.</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <table className="movies-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title</th>
                                        <th>Category</th>
                                        <th>Language</th>
                                        <th>Release Year</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedMovies.map((movie) => (
                                        <tr key={movie.film_id}>
                                            <td>{movie.film_id}</td>
                                            <td>
                                            <button 
                                                onClick={() => fetchFilmDetails(movie.film_id)} 
                                                style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "inherit" }}
                                            >
                                                {movie.title}
                                            </button>
                                           </td>
                                            <td>{movie.category}</td>
                                            <td>{movie.language}</td>
                                            <td>{movie.release_year}</td>
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
                </>
            )}
        </div>
    );
}

export default MoviesPage;
