import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, Hash, 
  AlertCircle, Lock, Edit3, ShieldCheck 
} from "lucide-react";
import { format } from "date-fns";

export default function ProfileReviewForm({ user, onSubmit, isProcessing }) {
  const [editableData, setEditableData] = useState({
    address: user?.address || '',
    tshirt_size: user?.tshirt_size || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(editableData);
  };

  if (!user) {
    return (
      <Card className="bg-white shadow-lg rounded-2xl">
        <CardContent className="p-8 text-center">
          <p className="text-slate-600">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg rounded-2xl">
      <CardContent className="p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Review Your Profile</h2>
          <p className="text-slate-600">
            Please review your information below. You can only edit your <strong>address</strong> and <strong>t-shirt size</strong>.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            For changes to other fields, please contact your administrator or CEO.
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Most fields are <strong>locked</strong> for security and accuracy. Only your address and t-shirt size can be updated.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Read-Only Fields */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" />
                Full Name
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">
                {user.first_name} {user.last_name}
              </p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Email
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">{user.email}</p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Phone
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">{user.phone || '—'}</p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Position
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">{user.position || '—'}</p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date of Birth
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">
                {user.dob ? format(new Date(user.dob), 'MMM dd, yyyy') : '—'}
              </p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Hash className="w-3 h-3" />
                SSN/Tax ID
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">
                {user.ssn_tax_id ? `•••-••-${user.ssn_tax_id.slice(-4)}` : '—'}
              </p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Team
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">{user.team_name || '—'}</p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Department
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">{user.department || '—'}</p>
            </div>

            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                💵 Hourly Rate
                <Lock className="w-3 h-3 text-amber-600" />
              </Label>
              <p className="text-slate-900 font-semibold mt-1">
                ${user.hourly_rate?.toFixed(2) || '0.00'}/hr
              </p>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4 text-green-700" />
              <h3 className="font-semibold text-green-900">Editable Fields</h3>
            </div>

            <div>
              <Label className="text-slate-700 font-medium flex items-center gap-1">
                <MapPin className="w-4 h-4 text-green-600" />
                Address
              </Label>
              <Input
                value={editableData.address}
                onChange={(e) => setEditableData({ ...editableData, address: e.target.value })}
                placeholder="Enter your full address"
                className="mt-1 border-green-300 focus:ring-green-500"
              />
            </div>

            <div>
              <Label className="text-slate-700 font-medium flex items-center gap-1">
                👕 T-Shirt Size
              </Label>
              <Select 
                value={editableData.tshirt_size} 
                onValueChange={(value) => setEditableData({ ...editableData, tshirt_size: value })}
              >
                <SelectTrigger className="border-green-300 focus:ring-green-500">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XS">XS</SelectItem>
                  <SelectItem value="S">S</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="XL">XL</SelectItem>
                  <SelectItem value="XXL">XXL</SelectItem>
                  <SelectItem value="XXXL">XXXL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>By submitting, you confirm all information is accurate</span>
            </div>
            <Button 
              type="submit" 
              disabled={isProcessing}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8"
            >
              {isProcessing ? 'Confirming...' : 'Confirm & Continue'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}