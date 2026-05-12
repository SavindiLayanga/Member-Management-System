import React, { createContext, useContext, useState } from 'react';
import { initialMembers } from '../data/mockData';

const MemberContext = createContext(null);

export function MemberProvider({ children }) {
  const [members, setMembers] = useState(initialMembers);

  const addMember = (member) => {
    const newMember = { ...member, id: Date.now().toString() };
    setMembers((prev) => [...prev, newMember]);
  };

  const updateMember = (id, updatedData) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updatedData } : m))
    );
  };

  const deleteMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const getMemberById = (id) => members.find((m) => m.id === id);

  const searchMembers = (filters) => {
    return members.filter((member) => {
      const checks = [];

      if (filters.name)
        checks.push(member.name.toLowerCase().includes(filters.name.toLowerCase()));
      if (filters.country)
        checks.push(
          member.countriesVisited?.some((c) =>
            c.toLowerCase().includes(filters.country.toLowerCase())
          )
        );
      if (filters.batch)
        checks.push(member.general?.batch === filters.batch);
      if (filters.placeOfWork)
        checks.push(
          member.placeOfWork?.toLowerCase().includes(filters.placeOfWork.toLowerCase())
        );
      if (filters.yearOfQualification)
        checks.push(member.yearOfQualification === filters.yearOfQualification);
      if (filters.award)
        checks.push(
          member.awardsReceived?.some((a) =>
            a.toLowerCase().includes(filters.award.toLowerCase())
          )
        );
      if (filters.conference)
        checks.push(
          member.conferencesAttended?.some((c) =>
            c.toLowerCase().includes(filters.conference.toLowerCase())
          )
        );
      if (filters.teachingAtOwnCollege !== undefined && filters.teachingAtOwnCollege !== '')
        checks.push(
          member.general?.isTeachingInOwnCollege === (filters.teachingAtOwnCollege === 'true')
        );
      if (filters.feeStatus)
        checks.push(member.fees?.status?.toLowerCase() === filters.feeStatus.toLowerCase());

      return checks.length === 0 || checks.every(Boolean);
    });
  };

  return (
    <MemberContext.Provider
      value={{ members, addMember, updateMember, deleteMember, getMemberById, searchMembers }}
    >
      {children}
    </MemberContext.Provider>
  );
}

export function useMembers() {
  return useContext(MemberContext);
}
