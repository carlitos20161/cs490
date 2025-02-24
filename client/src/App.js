import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import MoviesPage from "./movies";
import CustomersPage from "./customers";
import "./App.css";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/movies" element={<MoviesPage />} />
                <Route path="/customers" element={<CustomersPage />} />
            </Routes>
        </Router>
    );
}

function Home() {
    const [movies, setMovies] = useState([]);
    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedMovie, setExpandedMovie] = useState(null);
    const [expandedActor, setExpandedActor] = useState(null);
    const [selectedActorMovies, setSelectedActorMovies] = useState({});

    // Top 5 Rented Movies
    useEffect(() => {
        fetch("http://localhost:5001/top-rented-films")
            .then((response) => response.json())
            .then((data) => {
                setMovies(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching movies:", error);
                setLoading(false);
            });
    }, []);

    // Top 5 Actors
    useEffect(() => {
        fetch("http://localhost:5001/top-actors")
            .then((response) => response.json())
            .then((data) => {
                setActors(data);
            })
            .catch((error) => console.error("Error fetching actors:", error));
    }, []);

    //  movie details
    const toggleMovieDetails = (movieId) => {
        setExpandedMovie(expandedMovie === movieId ? null : movieId);
    };

    // actor details and fetch their top movies
    const toggleActorDetails = async (actorId) => {
        if (expandedActor === actorId) {
            setExpandedActor(null);
        } else {
            try {
                const response = await fetch(`http://localhost:5001/actor/${actorId}/top-movies`);
                const data = await response.json();

                setSelectedActorMovies(prevState => ({
                    ...prevState,
                    [actorId]: data.topMovies || [],
                }));

                setExpandedActor(actorId);
            } catch (error) {
                console.error("Error fetching actor details:", error);
            }
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1 className="title">🎬 SAKILA MOVIES</h1>
                {/* Link to Movies */}
                <Link to="/movies">
                    <button className="btn movies-btn">📽 View All Movies</button>
                </Link>
                {/* Link to Customers */}
                <Link to="/customers">
                    <button className="btn customers-btn">👤 View Customers</button>
                </Link>
            </div>

            <h2 className= "title">Top 5 Rented Movies</h2>
            {loading ? <p>Loading movies...</p> : (
                <div className="movie-grid">
                    {movies.map(movie => (
                        <div key={movie.film_id} className="movie-card">
                            <h2 className="movie-title">{movie.title}</h2>
                            <p><strong>Rentals:</strong> {movie.rented}</p>
                            <button className="btn" onClick={() => toggleMovieDetails(movie.film_id)}>
                                {expandedMovie === movie.film_id ? "Hide Details" : "See More"}
                            </button>
                            {expandedMovie === movie.film_id && <p>{movie.description}</p>}
                        </div>
                    ))}
                </div>
            )}

            <h2 className="title">🎭 Top 5 Actors</h2>
            <div className="actor-grid">
                {actors.map((actor) => (
                    <div key={actor.actor_id} className="actor-card">
                        <h3 className="actor-name">{actor.actor_name}</h3>
                        <p className="actor-movies">🎬 Movies: {actor.film_count}</p>

                        <button className="btn" onClick={() => toggleActorDetails(actor.actor_id)}>
                            {expandedActor === actor.actor_id ? "Hide Details" : "See More"}
                        </button>

                        {expandedActor === actor.actor_id && (
                            <div className="actor-details">
                                <h4>🎥 Top 5 Rented Films:</h4>
                                <ul>
                                    {selectedActorMovies[actor.actor_id] && selectedActorMovies[actor.actor_id].length > 0 ? (
                                        selectedActorMovies[actor.actor_id].map((movie) => (
                                            <li key={movie.film_id}>
                                                <strong>{movie.title}</strong> ({movie.release_year}) - Rentals: {movie.rented}
                                            </li>
                                        ))
                                    ) : (
                                        <p>Loading movies...</p>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
