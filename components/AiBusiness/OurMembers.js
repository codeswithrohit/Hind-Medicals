import React, { useState, useEffect } from 'react';
import { firebase } from '../../Firebase/config';
import { FiEdit2, FiX, FiCheckCircle, FiShield, FiUser } from 'react-icons/fi';

const OurMembers = ({ showAlert }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal Edit States
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    ownerName: '',
    role: '',
    isVerified: false,
    isActive: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = firebase.firestore().collection('HareKrishnaPharmacyAdmin')
      .onSnapshot(
        (snapshot) => {
          const usersList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setMembers(usersList);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching members:", error);
          showAlert('error', 'Failed to fetch members data.');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  const openEditModal = (member) => {
    setEditingId(member.id);
    setEditForm({
      ownerName: member.ownerName || '',
      role: member.role || '',
      isVerified: member.isVerified === true || member.isVerified === 'true', // Handle string 'pending' or boolean
      isActive: member.isActive === true || member.isActive === 'true' // Handle string 'pending' or boolean
    });
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditForm({ ownerName: '', role: '', isVerified: false, isActive: false });
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await firebase.firestore().collection('HareKrishnaPharmacyAdmin').doc(editingId).update({
        ownerName: editForm.ownerName,
        role: editForm.role,
        isVerified: editForm.isVerified,
        isActive: editForm.isActive
      });
      
      showAlert('success', 'Member details updated successfully!');
      closeEditModal();
    } catch (error) {
      console.error("Error updating member:", error);
      showAlert('error', 'Failed to update member.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-800 rounded w-1/4 mb-6"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-[#0B1221] border border-slate-800 rounded-xl w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up text-white">
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400">
          <FiShield size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Admin & Member Management</h2>
          <p className="text-xs text-slate-400 mt-1">View and manage roles and access verification for all platform users.</p>
        </div>
      </div>

      <div className="bg-[#0B1221] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="px-4 py-4 font-bold uppercase tracking-wider text-xs">User Info</th>
                <th className="px-4 py-4 font-bold uppercase tracking-wider text-xs">Role</th>
                <th className="px-4 py-4 font-bold uppercase tracking-wider text-xs">Verification</th>
                <th className="px-4 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                <th className="px-4 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <FiUser size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-white">{member.ownerName || 'No Name Provided'}</p>
                        <p className="text-[10px] font-mono text-indigo-400 mt-0.5">{member.verifiedMobile || 'No Mobile'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                      member.role === 'master admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                      member.role ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                      'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                      {member.role || 'NONE'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {member.isVerified === true ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                        <FiCheckCircle size={14} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {member.isActive === true ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      onClick={() => openEditModal(member)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-slate-700 hover:border-indigo-500"
                    >
                      <FiEdit2 size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              
              {members.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500 font-bold text-sm">
                    No members found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL OVERLAY */}
      {editingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-[#0B1221] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FiEdit2 className="text-indigo-400" /> Edit Member
              </h3>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-5 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">User Name</label>
                <input 
                  type="text" 
                  value={editForm.ownerName} 
                  onChange={(e) => setEditForm({...editForm, ownerName: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assign Role</label>
                <select 
                  value={editForm.role} 
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                >
                  <option value="">No Role (Blank)</option>
                  <option value="admin">Admin</option>
                  <option value="master admin">Master Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <label className="flex-1 flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-bold text-white">Is Verified?</span>
                  <input 
                    type="checkbox" 
                    checked={editForm.isVerified} 
                    onChange={(e) => setEditForm({...editForm, isVerified: e.target.checked})}
                    className="w-5 h-5 rounded text-indigo-600 bg-slate-800 border-slate-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                </label>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <label className="flex-1 flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-bold text-white">Is Active? (Allow Login)</span>
                  <input 
                    type="checkbox" 
                    checked={editForm.isActive} 
                    onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                    className="w-5 h-5 rounded text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                >
                  {isSaving ? 'Saving Changes...' : 'Save Member Details'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      
    </div>
  );
};

export default OurMembers;