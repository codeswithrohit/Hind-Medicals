import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../Firebase/config';
import { FiEdit, FiTrash2, FiEye, FiEyeOff, FiPlus, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const ReactQuill = dynamic(
    () => import('react-quill'),
    { 
      ssr: false,
      loading: () => <p>Loading editor...</p>
    }
  );
  
import 'react-quill/dist/quill.snow.css';
import dynamic from 'next/dynamic';

const Product = () => {
  const [products, setProducts] = useState([]);
  const [visibleProducts, setVisibleProducts] = useState(10);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('');
  const [selectedFilterMenu, setSelectedFilterMenu] = useState('');
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniqueMenus, setUniqueMenus] = useState([]);
  const [selectedAlphabet, setSelectedAlphabet] = useState('');

  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('');
  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [customBrand, setCustomBrand] = useState('');
  const [customMenu, setCustomMenu] = useState('');
  const [priceDetails, setPriceDetails] = useState([
    {
      price: '',
      purchaseprice: '',
      discountPrice: '',
      color: '',
      variant: '',
      stock: '',
      images: [],
    },
  ]);

  // Alphabet letters for filter
  const alphabet = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  }, []);

  // Fetch categories
  useEffect(() => {
    const unsubscribe = firebase.firestore()
      .collection('lifelineshop')
      .onSnapshot(querySnapshot => {
        const fetchedCategories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(fetchedCategories);
      });

    return () => unsubscribe();
  }, []);

  // Update menus when category changes
  useEffect(() => {
    if (selectedCategory) {
      const category = categories.find(cat => cat.id === selectedCategory);
      if (category && category.menus) {
        const updatedMenus = [...category.menus, { name: 'Other' }];
        setMenus(updatedMenus);
        
        if (editProductId && selectedMenu) {
          const menuExists = category.menus.some(m => m.name === selectedMenu);
          if (!menuExists && selectedMenu !== 'Other') {
            setSelectedMenu('');
          }
        }
      } else {
        setMenus([{ name: 'Other' }]);
        setSelectedMenu('');
      }
      setSelectedSubcategory('');
    }
  }, [selectedCategory, categories]);

  // Update subcategories when menu changes
  useEffect(() => {
    if (selectedMenu && selectedCategory) {
      if (selectedMenu === 'Other') {
        setSubcategories([{ name: 'Other' }]);
        return;
      }

      const category = categories.find(cat => cat.id === selectedCategory);
      if (category && category.menus) {
        const menu = category.menus.find(m => m.name === selectedMenu);
        if (menu && menu.subcategories) {
          const updatedSubcategories = [...menu.subcategories, { name: 'Other' }];
          setSubcategories(updatedSubcategories);
          
          if (editProductId && selectedSubcategory) {
            const subcategoryExists = menu.subcategories.some(s => s.name === selectedSubcategory);
            if (!subcategoryExists && selectedSubcategory !== 'Other') {
              setSelectedSubcategory('');
            }
          }
        } else {
          setSubcategories([{ name: 'Other' }]);
        }
      }
    }
  }, [selectedMenu, selectedCategory, categories]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const snapshot = await firebase.firestore().collection('Products').get();
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllProducts(productsData);
        setProducts(productsData.slice(0, 10));
        
        // Extract unique categories and menus for filtering
        const categories = [...new Set(productsData.map(p => p.category))];
        const menus = [...new Set(productsData.map(p => p.menu))];
        setUniqueCategories(categories);
        setUniqueMenus(menus);
      } catch (error) {
        console.error('Error fetching products: ', error);
        toast.error('Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search query and filters
  const filteredProducts = useMemo(() => {
    let result = allProducts;
    
    // Apply category filter
    if (selectedFilterCategory) {
      result = result.filter(product => product.category === selectedFilterCategory);
    }
    
    // Apply menu filter
    if (selectedFilterMenu) {
      result = result.filter(product => product.menu === selectedFilterMenu);
    }
    
    // Apply alphabet filter
    if (selectedAlphabet) {
      result = result.filter(product => 
        product.name.charAt(0).toUpperCase() === selectedAlphabet
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.companyName?.toLowerCase().includes(query) ||
        product.compositionName?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [allProducts, searchQuery, selectedFilterCategory, selectedFilterMenu, selectedAlphabet]);

  // Update menus when filter category changes
  useEffect(() => {
    if (selectedFilterCategory) {
      const menusInCategory = [...new Set(
        allProducts
          .filter(p => p.category === selectedFilterCategory)
          .map(p => p.menu)
      )];
      setUniqueMenus(menusInCategory);
      setSelectedFilterMenu(''); // Reset menu filter when category changes
    } else {
      const allMenus = [...new Set(allProducts.map(p => p.menu))];
      setUniqueMenus(allMenus);
    }
  }, [selectedFilterCategory, allProducts]);

  // Update current items for pagination
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

  // Reset filters
  const resetFilters = () => {
    setSelectedFilterCategory('');
    setSelectedFilterMenu('');
    setSelectedAlphabet('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
          Product Management ({allProducts.length} total, {filteredProducts.length} filtered)
        </h1>
        <div className="flex space-x-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search products..."
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button
            onClick={() => {
              resetForm();
              setModalVisible(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <FiPlus className="mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedFilterCategory}
            onChange={(e) => {
              setSelectedFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Menu</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedFilterMenu}
            onChange={(e) => {
              setSelectedFilterMenu(e.target.value);
              setCurrentPage(1);
            }}
            disabled={!selectedFilterCategory && uniqueMenus.length === 0}
          >
            <option value="">All Menus</option>
            {uniqueMenus.map((menu, index) => (
              <option key={index} value={menu}>
                {menu}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={resetFilters}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Alphabet Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Alphabet</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedAlphabet('');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md text-sm ${
              selectedAlphabet === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {alphabet.map((letter) => (
            <button
              key={letter}
              onClick={() => {
                setSelectedAlphabet(selectedAlphabet === letter ? '' : letter);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md text-sm ${
                selectedAlphabet === letter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category-Menu-Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.priceDetails?.[0]?.images?.[0] && (
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={product.priceDetails[0].images[0]}
                              alt={product.name}
                            />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">Company:{product.companyName}</div>
                        </div>
                      </div>
                    </td>
                
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category}-{product.menu}-{product.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.priceDetails?.[0] && (
                        <div className="text-sm text-gray-900">
                          ₹{product.priceDetails[0].discountPrice}
                          {product.priceDetails[0].price > product.priceDetails[0].discountPrice && (
                            <span className="ml-2 text-sm text-gray-500 line-through">
                              ₹{product.priceDetails[0].price}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.View === 'True'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.View === 'True' ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {/* <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleToggleView(product.id)}
                          className={product.View === 'True' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-gray-700'}
                        >
                          {product.View === 'True' ? (
                            <FiEye className="h-5 w-5" />
                          ) : (
                            <FiEyeOff className="h-5 w-5" />
                          )}
                        </button>
                      </div> */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredProducts.length > itemsPerPage && (
            <div className="px-5 py-5 bg-white border-t flex flex-col xs:flex-row items-center xs:justify-between">
              <div className="text-xs xs:text-sm text-gray-900">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredProducts.length)} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} Products
              </div>
              <div className="inline-flex mt-2 xs:mt-0">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-l ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FiChevronLeft className="inline mr-1" /> Prev
                </button>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-r ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Next <FiChevronRight className="inline ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* The rest of your modal code remains the same... */}
    </div>
  );
};

export default Product;