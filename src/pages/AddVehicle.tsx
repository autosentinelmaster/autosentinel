import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Car, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoIcon from '@/assets/logo-icon.png';

export default function AddVehicle() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [fuelCapacity, setFuelCapacity] = useState('50');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (editId) {
      fetchVehicle();
    }
  }, [user, authLoading, navigate, editId]);

  const fetchVehicle = async () => {
    if (!editId) return;
    
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', editId)
      .single();
    
    if (error || !data) {
      toast.error('Vehicle not found');
      navigate('/dashboard');
      return;
    }
    
    setName(data.name);
    setMake(data.make || '');
    setModel(data.model || '');
    setLicensePlate(data.license_plate || '');
    setFuelCapacity(data.fuel_capacity_liters.toString());
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !name.trim()) {
      toast.error('Please enter a vehicle name');
      return;
    }

    setSubmitting(true);

    const carData = {
      owner_id: user.id,
      name: name.trim(),
      make: make.trim() || null,
      model: model.trim() || null,
      license_plate: licensePlate.trim() || null,
      fuel_capacity_liters: parseFloat(fuelCapacity) || 50,
    };

    if (editId) {
      const { error } = await supabase
        .from('cars')
        .update(carData)
        .eq('id', editId);

      if (error) {
        toast.error('Failed to update vehicle');
      } else {
        toast.success('Vehicle updated successfully! 🚗');
        navigate('/dashboard');
      }
    } else {
      const { error } = await supabase
        .from('cars')
        .insert(carData);

      if (error) {
        toast.error('Failed to add vehicle');
      } else {
        toast.success('Vehicle added successfully! 🚗');
        navigate('/dashboard');
      }
    }
    
    setSubmitting(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoIcon} alt="AutoSentinel" className="h-9 w-9 rounded-lg object-cover" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-bold">{editId ? 'Edit Vehicle' : 'Add Vehicle'}</h1>
              <p className="text-xs text-muted-foreground">Register your vehicle details</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <Card className="animate-in">
          <CardHeader className="pb-4">
            <CardTitle className="font-display flex items-center gap-2 text-xl">
              <Car className="h-6 w-6 text-primary" />
              {editId ? 'Edit Vehicle ✏️' : 'Add New Vehicle 🚗'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="carName">Vehicle Name *</Label>
              <Input
                id="carName"
                placeholder="e.g., Family SUV"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  placeholder="e.g., Toyota"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="e.g., Camry"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license">License Plate</Label>
                <Input
                  id="license"
                  placeholder="e.g., MH12AB1234"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel">Fuel Capacity (L)</Label>
                <Input
                  id="fuel"
                  type="number"
                  placeholder="50"
                  value={fuelCapacity}
                  onChange={(e) => setFuelCapacity(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')} 
                className="flex-1 py-6 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1 py-6 text-base rounded-xl" 
                size="lg"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : (editId ? 'Update Vehicle' : 'Add Vehicle')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
