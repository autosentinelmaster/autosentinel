import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (carId: string, carName: string) => {
    setDeletingId(carId);
    
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', carId);

    if (error) {
      toast.error('Failed to delete vehicle');
    } else {
      toast.success(`${carName} deleted`);
      fetchCars();
    }
    setDeletingId(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5 text-primary" />
            My Vehicles 🚗
          </CardTitle>
          <Link to="/add-vehicle">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </Link>
        </div>
        <p className="help-text">Register your cars, bikes, or any vehicle for token assignment</p>
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
                  <Link to={`/add-vehicle?edit=${car.id}`}>
                    <Button variant="ghost" size="icon">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(car.id, car.name)}
                    disabled={deletingId === car.id}
                  >
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
