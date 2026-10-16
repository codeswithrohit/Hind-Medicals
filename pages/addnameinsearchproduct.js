import React, { useState, useEffect } from 'react';
import { firebase } from '../Firebase/config';

const Test = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Fetch all products
                const snapshot = await firebase.firestore().collection('Products').get();
                const productsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setProducts(productsData);
                
                // Create an array of all product names
                const productNames = productsData.map(product => product.name);
                
                // Create/update the searchproduct collection with all names
                await firebase.firestore().collection('searchproduct').doc('allProductNames').set({
                    names: productNames,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log("All product names stored in searchproduct collection");
                
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchProducts();
    }, []);
    
    console.log("All products data:", products);
    
    return (
        <div>
            {loading ? (
                <p>Loading products...</p>
            ) : (
                <p>Total products loaded: {products.length}</p>
            )}
        </div>
    );
}

export default Test;