import React, { useState, useEffect } from 'react';
import { firebase } from '../../Firebase/config';

const Index = () => {
  const [products, setProducts] = useState([]);
  const [duplicates, setDuplicates] = useState({});
  const [loading, setLoading] = useState(true);
  const db = firebase.firestore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const snapshot = await db.collection('Products').get();
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(productsData);
      findDuplicates(productsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products: ", error);
      setLoading(false);
    }
  };

  const findDuplicates = (products) => {
    const nameCount = {};
    const duplicatesMap = {};

    // Count occurrences of each name
    products.forEach(product => {
      if (product.name) {
        nameCount[product.name] = (nameCount[product.name] || 0) + 1;
      }
    });

    // Filter names that appear more than once
    const duplicateNames = Object.keys(nameCount).filter(name => nameCount[name] > 1);

    // Group products by duplicate names
    duplicateNames.forEach(name => {
      duplicatesMap[name] = products.filter(product => product.name === name);
    });

    setDuplicates(duplicatesMap);
  };

  const handleDeleteAll = () => {
    const duplicateCount = Object.values(duplicates).reduce((sum, group) => sum + group.length - 1, 0);
    
    if (window.confirm(`Are you sure you want to delete ALL duplicates? This will remove ${duplicateCount} products, keeping one of each name.`)) {
      deleteAllDuplicates();
    }
  };

  const deleteAllDuplicates = async () => {
    try {
      // Get all products grouped by name
      const snapshot = await db.collection('Products').get();
      const productsByName = {};
      
      snapshot.docs.forEach(doc => {
        const product = doc.data();
        if (!productsByName[product.name]) {
          productsByName[product.name] = [];
        }
        productsByName[product.name].push(doc);
      });

      // For each name, keep the first document and delete the rest
      const batch = db.batch();
      let deleteCount = 0;
      
      Object.entries(productsByName).forEach(([name, docs]) => {
        if (docs.length > 1) {
          // Skip the first document, delete the rest
          for (let i = 1; i < docs.length; i++) {
            batch.delete(docs[i].ref);
            deleteCount++;
          }
        }
      });

      await batch.commit();
      alert(`Successfully deleted ${deleteCount} duplicate products, keeping one of each name.`);
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error("Error deleting duplicates: ", error);
      alert("Error deleting duplicates. Please try again.");
    }
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="container">
      <h1>Duplicate Products</h1>
      
      {Object.keys(duplicates).length === 0 ? (
        <p>No duplicate products found.</p>
      ) : (
        <>
          <button 
            onClick={handleDeleteAll}
            style={{ 
              marginBottom: '20px',
              padding: '10px 15px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Delete All Duplicates
          </button>
          
          <div className="duplicates-list">
            {Object.entries(duplicates).map(([name, products]) => (
              <div key={name} className="duplicate-group">
                <h3>
                  {name} ({products.length} duplicates)
                </h3>
                <table border="1" cellPadding="5" cellSpacing="0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Other Fields</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={product.id}>
                        <td>{product.id}</td>
                        <td>{product.name}</td>
                        <td>
                          {Object.entries(product).map(([key, value]) => {
                            if (key !== 'id' && key !== 'name') {
                              return (
                                <div key={key}>
                                  <strong>{key}:</strong> {JSON.stringify(value)}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Index;