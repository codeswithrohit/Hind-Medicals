import React, { useState, useEffect, useMemo } from 'react';
import { firebase } from '../../Firebase/config';
import { FiEdit, FiTrash2, FiEye, FiEyeOff, FiPlus, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { debounce } from 'lodash';
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
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniqueMenus, setUniqueMenus] = useState([]);
  const [itemsPerPage] = useState(10);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('');
  const [selectedFilterMenu, setSelectedFilterMenu] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('');
  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);
  const [selectedAlphabet, setSelectedAlphabet] = useState('');
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

  const updateLifelineShopWithMenu = async (categoryId, menuName) => {
    try {
      const categoryRef = firebase.firestore().collection('lifelineshop').doc(categoryId);
      const categoryDoc = await categoryRef.get();
      
      if (categoryDoc.exists) {
        const categoryData = categoryDoc.data();
        const menuExists = categoryData.menus?.some(menu => menu.name === menuName);
        
        if (!menuExists) {
          const updatedMenus = [
            ...(categoryData.menus || []),
            {
              name: menuName,
              subcategories: []
            }
          ];
          
          await categoryRef.update({ menus: updatedMenus });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error updating lifelineshop with menu: ', error);
      return false;
    }
  };

  const updateLifelineShopWithBrand = async (categoryId, menuName, brandName) => {
    try {
      const categoryRef = firebase.firestore().collection('lifelineshop').doc(categoryId);
      const categoryDoc = await categoryRef.get();
      
      if (categoryDoc.exists) {
        const categoryData = categoryDoc.data();
        const updatedMenus = categoryData.menus.map(menu => {
          if (menu.name === menuName) {
            const brandExists = menu.subcategories?.some(subcat => subcat.name === brandName);
            
            if (!brandExists) {
              return {
                ...menu,
                subcategories: [
                  ...(menu.subcategories || []),
                  { name: brandName }
                ]
              };
            }
          }
          return menu;
        });
        
        await categoryRef.update({ menus: updatedMenus });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating lifelineshop with brand: ', error);
      return false;
    }
  };

  // Handle form submission
  const handleAddOrUpdateProduct = async () => {
    if (!productName || !selectedCategory || !selectedMenu || !selectedSubcategory) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setUploading(true);
      
      // Upload images and get URLs
      const updatedPriceDetails = await Promise.all(
        priceDetails.map(async (detail) => {
          if (!detail.price || !detail.discountPrice) {
            throw new Error('Price and discount price are required for all variants');
          }
          const imageUrls = await uploadImages(detail.images);
          return {
            ...detail,
            images: imageUrls,
          };
        })
      );

      const categoryName = categories.find(cat => cat.id === selectedCategory)?.name || '';
      let menuName = selectedMenu;
      let brandName = selectedSubcategory;

      // Handle custom menu creation
      if (selectedMenu === 'Other' && customMenu) {
        const success = await updateLifelineShopWithMenu(selectedCategory, customMenu);
        if (success) {
          menuName = customMenu;
        } else {
          toast.error('Failed to create new menu');
          return;
        }
      }

      // Handle custom brand creation
      if (selectedSubcategory === 'Other' && customBrand) {
        const success = await updateLifelineShopWithBrand(selectedCategory, menuName, customBrand);
        if (success) {
          brandName = customBrand;
        } else {
          toast.error('Failed to create new brand');
          return;
        }
      }

      const productData = {
        name: productName,
        description: productDescription,
        category: categoryName,
        menu: menuName,
        brand: brandName,
        mainCategory: 'LIFELINESHOP',
        priceDetails: updatedPriceDetails,
        Active: 'True',
        View: 'True',
        categoryName: categoryName,
      };

      if (editProductId) {
        await firebase.firestore().collection('Products').doc(editProductId).update(productData);
        toast.success('Product updated successfully!');
      } else {
        await firebase.firestore().collection('Products').add(productData);
        toast.success('Product added successfully!');
      }

      // Refresh product list
      const snapshot = await firebase.firestore().collection('Products').get();
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);

      // Reset form and close modal
      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.error('Error handling product: ', error);
      toast.error(error.message || 'Failed to handle product. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Image upload function
  const uploadImages = async (images) => {
    const imageUrls = [];
    
    for (const image of images) {
      if (image.uri && image.uri.startsWith('http')) {
        imageUrls.push(image.uri);
        continue;
      }

      try {
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const filename = `${Date.now()}-${image.uri.substring(image.uri.lastIndexOf('/') + 1)}`;
        const storageRef = firebase.storage().ref().child(`products/${filename}`);
        
        const uploadTask = storageRef.put(blob);
        
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          }
        );
        
        await uploadTask;
        const downloadURL = await storageRef.getDownloadURL();
        imageUrls.push(downloadURL);
      } catch (error) {
        console.error('Error uploading image: ', error);
        throw new Error('Failed to upload images');
      }
    }
    
    return imageUrls;
  };

  // Handle image selection
  const handleSelectImages = async (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      const newImages = files.map(file => ({
        uri: URL.createObjectURL(file),
        file,
      }));
      
      const updatedPriceDetails = [...priceDetails];
      updatedPriceDetails[index].images = [
        ...updatedPriceDetails[index].images,
        ...newImages,
      ];
      setPriceDetails(updatedPriceDetails);
    };
    
    input.click();
  };

  // Handle image removal
  const handleRemoveImage = (index, imageIndex) => {
    const updatedPriceDetails = [...priceDetails];
    updatedPriceDetails[index].images = updatedPriceDetails[index].images.filter((_, idx) => idx !== imageIndex);
    setPriceDetails(updatedPriceDetails);
  };

  // Handle price detail changes
  const handlePriceDetailChange = (index, field, value) => {
    const updatedPriceDetails = [...priceDetails];
    updatedPriceDetails[index][field] = value;
    setPriceDetails(updatedPriceDetails);
  };

  // Add new price detail
  const handleAddPriceDetail = () => {
    setPriceDetails([
      ...priceDetails,
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
  };

  // Remove price detail
  const handleRemovePriceDetail = (index) => {
    if (priceDetails.length <= 1) {
      toast.error('At least one variant is required');
      return;
    }
    setPriceDetails(priceDetails.filter((_, idx) => idx !== index));
  };

  // Edit product
  const handleEditProduct = async (product) => {
    setProductName(product.name);
    setProductDescription(product.description || '');
    
    // Find category ID by name
    const category = categories.find(cat => cat.name === product.category);
    
    // Set the category first
    setSelectedCategory(category?.id || '');
    
    // Wait for the state to update before setting the menu
    await new Promise(resolve => setTimeout(resolve, 0));
    
    setSelectedMenu(product.menu || '');
    
    // Wait again for the menu state to update before setting the subcategory
    await new Promise(resolve => setTimeout(resolve, 0));
    
    setSelectedSubcategory(product.brand || '');
    
    setPriceDetails(
      product.priceDetails?.map(detail => ({
        price: detail.price || '',
        purchaseprice: detail.purchaseprice || '',
        discountPrice: detail.discountPrice || '',
        color: detail.color || '',
        variant: detail.variant || '',
        stock: detail.stock || '',
        images: detail.images?.map(uri => ({ uri })) || [],
      })) || [{
        price: '',
        discountPrice: '',
        purchaseprice: '',
        color: '',
        variant: '',
        stock: '',
        images: [],
      }]
    );
    
    setEditProductId(product.id);
    setModalVisible(true);
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await firebase.firestore().collection('Products').doc(productId).delete();
        setProducts(products.filter(product => product.id !== productId));
        toast.success('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product: ', error);
        toast.error('Failed to delete product. Please try again.');
      }
    }
  };

  // Toggle product visibility
  const handleToggleView = async (productId) => {
    try {
      const productRef = firebase.firestore().collection('Products').doc(productId);
      const productSnapshot = await productRef.get();
      const productData = productSnapshot.data();
      
      const newViewStatus = productData.View === 'True' ? 'False' : 'True';
      
      await productRef.update({ View: newViewStatus });
      
      setProducts(products.map(product => 
        product.id === productId ? { ...product, View: newViewStatus } : product
      ));
      
      toast.success(`Product is now ${newViewStatus === 'True' ? 'visible' : 'hidden'}`);
    } catch (error) {
      console.error('Error toggling view: ', error);
      toast.error('Failed to toggle view status. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setProductName('');
    setProductDescription('');
    setSelectedCategory('');
    setSelectedMenu('');
    setSelectedSubcategory('');
    setCustomBrand('');
    setCustomMenu('');
    setPriceDetails([{
      price: '',
      discountPrice: '',
      purchaseprice: '',
      color: '',
      variant: '',
      stock: '',
      images: [],
    }]);
    setEditProductId(null);
  };

  // Filter products based on search query
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

  useEffect(() => {
    setProducts(filteredProducts);
  }, [filteredProducts]);

  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        setSearchQuery(query);
      }, 300),
    []
  );
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

  const resetFilters = () => {
    setSelectedFilterCategory('');
    setSelectedFilterMenu('');
    setSelectedAlphabet('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearch = (e) => {
    const query = e.target.value;
    debouncedSearch(query);
  };
console.log("allproduct",allProducts)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
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

  return (
    <div className="container mx-auto px-4 py-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header and Search */}
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
                      <div className="flex space-x-2">
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
                      </div>
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

      {/* Add/Edit Product Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editProductId ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => {
                  resetForm();
                  setModalVisible(false);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menu *</label>
                  <div className="flex">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={selectedMenu}
                      onChange={(e) => setSelectedMenu(e.target.value)}
                      disabled={!selectedCategory}
                      required
                    >
                      <option value="">Select Menu</option>
                      <option value="Other">Other</option>
                      {menus.filter(menu => menu.name !== 'Other').map((menu, index) => (
                        <option key={index} value={menu.name}>
                          {menu.name}
                        </option>
                      ))}
                    </select>
                    {selectedMenu === 'Other' && (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border-t border-b border-r border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={customMenu}
                        onChange={(e) => setCustomMenu(e.target.value)}
                        placeholder="Enter menu name"
                        required
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                  <div className="flex">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      disabled={!selectedMenu}
                      required
                    >
                      <option value="">Select Brand</option>
                      <option value="Other">Other</option>
                      {subcategories.filter(subcat => subcat.name !== 'Other').map((subcat, index) => (
                        <option key={index} value={subcat.name}>
                          {subcat.name}
                        </option>
                      ))}
                    </select>
                    {selectedSubcategory === 'Other' && (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border-t border-b border-r border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        placeholder="Enter brand name"
                        required
                      />
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {typeof window !== 'undefined' && (
                  <ReactQuill
                    theme="snow"
                    value={productDescription}
                    onChange={setProductDescription}
                    className="border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                )}
              </div>

              <h4 className="text-md font-medium text-gray-900 mb-4">Product Variants *</h4>
              
              {priceDetails.map((detail, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-sm font-medium text-gray-700">Variant #{index + 1}</h5>
                    {priceDetails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePriceDetail(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove Variant
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={detail.price}
                        onChange={(e) => handlePriceDetailChange(index, 'price', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price (₹) *</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={detail.discountPrice}
                        onChange={(e) => handlePriceDetailChange(index, 'discountPrice', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (₹) *</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={detail.purchaseprice}
                        onChange={(e) => handlePriceDetailChange(index, 'purchaseprice', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Variant Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={detail.variant}
                        onChange={(e) => handlePriceDetailChange(index, 'variant', e.target.value)}
                        placeholder="e.g. Large, Small, 500ml"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={detail.stock}
                        onChange={(e) => handlePriceDetailChange(index, 'stock', e.target.value)}
                        placeholder="Enter quantity"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
                    <button
                      type="button"
                      onClick={() => handleSelectImages(index)}
                      className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {detail.images.length > 0
                        ? `Add More Images (${detail.images.length})`
                        : 'Select Images'}
                    </button>
                    
                    {detail.images.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-2">
    {detail.images.map((image, imgIndex) => (
      <div key={imgIndex} className="relative">
        <div className="relative h-80 w-80">
          <img
            src={image.uri}
            alt={`Variant ${index + 1} Image ${imgIndex + 1}`}
            className="h-full w-full object-cover rounded"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-2xl font-bold opacity-120 select-none pointer-events-none transform rotate-[60deg]">
              Lifeline Shop
            </span>
          </div>
        </div>
        <button
          onClick={() => handleRemoveImage(index, imgIndex)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center"
        >
          <FiX className="h-3 w-3" />
        </button>
      </div>
    ))}
  </div>
)}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddPriceDetail}
                className="mt-2 mb-6 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                + Add Another Variant
              </button>

              {uploading && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Uploading images...</span>
                    <span>{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setModalVisible(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddOrUpdateProduct}
                  disabled={uploading}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    'Processing...'
                  ) : editProductId ? (
                    'Update Product'
                  ) : (
                    'Add Product'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Product;