import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Car, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface CarData {
  id: string;
  owner_id: string;
  name: string;
  make: string | null;
  model: string | null;
  license_plate: string | null;
  fuel_capacity_liters: number;
  created_at: string;
}

interface CarManagerProps {
  onCarsChange?: (cars: CarData[]) => void;
}

export function CarManager({ onCarsChange }: CarManagerProps) {
  const { user } = useAuth();
  const [cars, setCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CarData | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [fuelCapacity, setFuelCapacity] = useState('50');

  useEffect(() => {
    if (user) {
      fetchCars();
    }
  }, [user]);

  const fetchCars = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cars:', error);
    } else {
      setCars(data || []);
      onCarsChange?.(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setMake('');
    setModel('');
    setLicensePlate('');
    setFuelCapacity('50');
    setEditingCar(null);
  };

  const handleSubmit = async () => {
    if (!user || !name.trim()) {
      toast.error('Please enter a car name');
      return;
    }

    const carData = {
      owner_id: user.id,
      name: name.trim(),
      make: make.trim() || null,
      model: model.trim() || null,
      license_plate: licensePlate.trim() || null,
      fuel_capacity_liters: parseFloat(fuelCapacity) || 50,
    };

    if (editingCar) {
      const { error } = await supabase
        .from('cars')
        .update(carData)
        .eq('id', editingCar.id);

      if (error) {
        toast.error('Failed to update car');
      } else {
        toast.success('Car updated successfully');
        fetchCars();
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('cars')
        .insert(carData);

      if (error) {
        toast.error('Failed to add car');
      } else {
        toast.success('Car added successfully');
        fetchCars();
        setDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (car: CarData) => {
    setEditingCar(car);
    setName(car.name);
    setMake(car.make || '');
    setModel(car.model || '');
    setLicensePlate(car.license_plate || '');
    setFuelCapacity(car.fuel_capacity_liters.toString());
    setDialogOpen(true);
  };

  const handleDelete = async (carId: string) => {
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', carId);

    if (error) {
      toast.error('Failed to delete car');
    } else {
      toast.success('Car deleted');
      fetchCars();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5 text-primary" />
            My Vehicles
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Car
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCar ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="carName">Car Name *</Label>
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
                <Button onClick={handleSubmit} className="w-full">
                  {editingCar ? 'Update Vehicle' : 'Add Vehicle'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="help-text">Register your vehicles for token assignment</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : cars.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No vehicles registered yet</p>
            <p className="text-sm">Add your first car to create driving tokens</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cars.map((car) => (
              <div 
                key={car.id} 
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{car.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[car.make, car.model].filter(Boolean).join(' ') || 'No details'}
                      {car.license_plate && ` • ${car.license_plate}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(car)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(car.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
