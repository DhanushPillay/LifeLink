import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BLOOD_GROUPS, ORGANS, calculateAge } from '../utils/helpers';
import './Auth.css';

export default function CompleteProfile() {
  const { completeProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [gender, setGender] = useState('');
  const [weight, setWeight] = useState('');
  const [smoker, setSmoker] = useState(false);
  const [alcoholic, setAlcoholic] = useState(false);
  const [illnesses, setIllnesses] = useState('');
  const [donateBlood, setDonateBlood] = useState(false);
  const [donateOrgan, setDonateOrgan] = useState(false);
  const [selectedOrgans, setSelectedOrgans] = useState([]);
  const [error, setError] = useState('');

  const age = calculateAge(dob);

  const toggleOrgan = (organ) => {
    setSelectedOrgans((prev) =>
      prev.includes(organ) ? prev.filter((o) => o !== organ) : [...prev, organ]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!dob) {
      setError('Date of birth is required');
      return;
    }
    if (!bloodGroup) {
      setError('Blood group is required');
      return;
    }

    completeProfile({
      name: name.trim(),
      dob,
      age,
      bloodGroup,
      gender: gender || 'Not specified',
      weight: weight || 'Not specified',
      smoker,
      alcoholic,
      illnesses: illnesses || 'None',
      donateBlood,
      donateOrgan,
      organs: selectedOrgans,
    });
    navigate('/dashboard');
  };

  return (
    <div className="profile-page">
      <div className="bg-gradient" />
      <div className="profile-card glass-strong">
        <h2>Complete Your Profile</h2>
        <p className="auth-subtitle">
          Help others find you in emergencies. Required fields are marked with *.
        </p>

        <form onSubmit={handleSubmit}>
          <p className="profile-section-title">Personal Information *</p>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input
                className="form-input"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                className="form-input"
                type="text"
                value={age !== null ? `${age} years` : ''}
                disabled
                placeholder="Auto-calculated"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Blood Group *</label>
              <select
                className="form-input"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <p className="profile-section-title">Medical Details (Optional)</p>
          <div className="form-group">
            <label className="form-label">Weight</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. 70 kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="toggle-row">
              <div className="toggle-row-info">
                <h4>Smoker</h4>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={smoker} onChange={(e) => setSmoker(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="toggle-row">
              <div className="toggle-row-info">
                <h4>Alcoholic</h4>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={alcoholic} onChange={(e) => setAlcoholic(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Existing Illnesses / Notes</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Any medical conditions or notes"
              value={illnesses}
              onChange={(e) => setIllnesses(e.target.value)}
            />
          </div>

          <p className="profile-section-title">Donation Preferences</p>
          <div className="toggle-row">
            <div className="toggle-row-info">
              <h4>Donate Blood in Emergency</h4>
              <p>Allow others to find you when blood is urgently needed nearby</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={donateBlood} onChange={(e) => setDonateBlood(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="toggle-row">
            <div className="toggle-row-info">
              <h4>Donate Organ in Emergency</h4>
              <p>Register as an organ donor for critical situations</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={donateOrgan} onChange={(e) => setDonateOrgan(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          {donateOrgan && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Organs willing to donate</label>
              <div className="filter-chips">
                {ORGANS.map((organ) => (
                  <button
                    key={organ}
                    type="button"
                    className={`filter-chip ${selectedOrgans.includes(organ) ? 'filter-chip-active' : ''}`}
                    onClick={() => toggleOrgan(organ)}
                  >
                    {organ}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>
            Save & Continue to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
