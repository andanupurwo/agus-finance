import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Trash2, Mail } from 'lucide-react';
import { 
  inviteMemberToFamily, 
  updateMemberRole, 
  removeMemberFromFamily,
  getFamilyMembers 
} from '../utils/userRoles';

export function FamilyManagement({ 
  familyId, 
  currentUserId, 
  userRole, 
  showToast, 
  showConfirm 
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);

  // Load family members
  const loadMembers = async () => {
    try {
      setLoading(true);
      const familyMembers = await getFamilyMembers(familyId);
      setMembers(familyMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
      showToast?.('Gagal memuat anggota keluarga', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (familyId) {
      loadMembers();
    }
  }, [familyId]);

  const handleAddMember = async () => {
    if (!newMemberEmail) {
      showToast?.('Masukkan email anggota keluarga', 'error');
      return;
    }

    if (!newMemberEmail.includes('@')) {
      showToast?.('Format email tidak valid', 'error');
      return;
    }

    setAddingMember(true);
    try {
      const result = await inviteMemberToFamily(familyId, newMemberEmail, selectedRole);
      if (result.success) {
        showToast?.(result.message, 'success');
        setNewMemberEmail('');
        setSelectedRole('member');
        loadMembers();
      } else {
        showToast?.(result.message, 'error');
      }
    } catch (err) {
      console.error('Failed to add member:', err);
      showToast?.('Gagal menambahkan anggota', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    if (memberId === currentUserId) {
      showToast?.('❌ Tidak bisa mengubah role Anda sendiri', 'error');
      return;
    }

    const confirmed = await showConfirm?.(
      `Ubah role menjadi ${newRole}? (Perubahan langsung berlaku)`
    );

    if (confirmed) {
      try {
        const result = await updateMemberRole(familyId, memberId, newRole);
        if (result.success) {
          showToast?.(result.message, 'success');
          loadMembers();
        }
      } catch (err) {
        console.error('Failed to update role:', err);
        showToast?.('Gagal mengubah role', 'error');
      }
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (memberId === currentUserId) {
      showToast?.('❌ Tidak bisa menghapus diri Anda sendiri dari keluarga', 'error');
      return;
    }

    const confirmed = await showConfirm?.(
      `Yakin hapus "${memberName}" dari keluarga?\n\nMereka tidak bisa akses data keluarga lagi.`
    );

    if (confirmed) {
      try {
        const result = await removeMemberFromFamily(familyId, memberId);
        if (result.success) {
          showToast?.(result.message, 'success');
          loadMembers();
        }
      } catch (err) {
        console.error('Failed to remove member:', err);
        showToast?.('Gagal menghapus anggota', 'error');
      }
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'superadmin': return '👑 Superadmin';
      case 'admin': return '⚙️ Admin';
      case 'member': return '👤 Member';
      case 'viewer': return '👁️ Viewer';
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'superadmin': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'admin': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'member': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'viewer': return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
      default: return '';
    }
  };

  const canManageMembers = userRole === 'superadmin' || userRole === 'admin';

  return (
    <div className="space-y-4">
      {/* Add Member Section */}
      {canManageMembers && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <UserPlus size={18} />
            Tambah Anggota Keluarga
          </h4>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="Email anggota (contoh: istri@gmail.com)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 text-sm"
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="superadmin">👑 Superadmin</option>
                <option value="admin">⚙️ Admin</option>
                <option value="member">👤 Member</option>
                <option value="viewer">👁️ Viewer</option>
              </select>
            </div>

            <button
              onClick={handleAddMember}
              disabled={addingMember || !newMemberEmail}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Mail size={16} />
              {addingMember ? 'Menambahkan...' : 'Kirim Undangan'}
            </button>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              💡 Undangan dikirim ke email. Mereka akan otomatis join saat login dengan Google.
            </p>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users size={18} />
          Anggota Keluarga ({members.length})
        </h4>

        {loading ? (
          <div className="text-center py-4 text-slate-500">Memuat...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-4 text-slate-500">Belum ada anggota keluarga</div>
        ) : (
          members.map((member) => (
            <div
              key={member.uid}
              className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {member.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-900 dark:text-white">
                        {member.displayName}
                        {member.uid === currentUserId && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            Anda
                          </span>
                        )}
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Mail size={12} />
                        {member.email}
                      </p>
                    </div>
                  </div>

                  {/* Role & Joined Date */}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Bergabung: {new Date(member.joinedAt).toLocaleDateString('id-ID')}
                  </div>
                </div>

                {/* Role Selection & Delete Button */}
                {canManageMembers && member.uid !== currentUserId && (
                  <div className="flex items-center gap-2 ml-3">
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.uid, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getRoleColor(member.role)}`}
                    >
                      <option value="superadmin">👑 Superadmin</option>
                      <option value="admin">⚙️ Admin</option>
                      <option value="member">👤 Member</option>
                      <option value="viewer">👁️ Viewer</option>
                    </select>

                    <button
                      onClick={() => handleRemoveMember(member.uid, member.displayName)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Hapus anggota"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {/* Show role only for non-editable */}
                {(!canManageMembers || member.uid === currentUserId) && (
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Permissions Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
        <p className="font-semibold mb-2">📋 Penjelasan Role:</p>
        <ul className="space-y-1">
          <li><strong>Superadmin:</strong> Penuh kontrol, bisa kelola anggota & hapus keluarga</li>
          <li><strong>Admin:</strong> Bisa buat/edit/hapus wallet, budget, transaksi</li>
          <li><strong>Member:</strong> Bisa lihat & buat transaksi (edit terbatas)</li>
          <li><strong>Viewer:</strong> Hanya bisa lihat data, tidak bisa edit</li>
        </ul>
      </div>
    </div>
  );
}
