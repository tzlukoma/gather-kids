
"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


const DEMO_USERS = {
    admin: { email: 'admin@example.com', password: 'password', is_active: true },
    leader: { email: 'leader@example.com', password: 'password', is_active: true },
};

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        if (email === DEMO_USERS.admin.email && password === DEMO_USERS.admin.password) {
            login({
                id: 'user_admin',
                name: 'Admin User',
                role: 'admin',
                email: DEMO_USERS.admin.email,
                is_active: true,
            });
             toast({ title: "Login Successful", description: "Welcome, Admin!" });
            router.push('/dashboard');
        } else if (email === DEMO_USERS.leader.email && password === DEMO_USERS.leader.password) {
            login({
                id: 'user_leader_1',
                name: 'Sarah Lee',
                role: 'leader',
                email: DEMO_USERS.leader.email,
                is_active: true,
            });
            toast({ title: "Login Successful", description: "Welcome, Leader!" });
            router.push('/dashboard/check-in');
        } else {
            toast({ title: "Invalid Credentials", description: "Please use one of the demo accounts.", variant: "destructive" });
        }
    };
    
    const prefillDemoCredentials = (role: 'admin' | 'leader') => {
        setEmail(DEMO_USERS[role].email);
        setPassword(DEMO_USERS[role].password);
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/50 p-4">
            <div className="mb-8">
                 <Link href="/" className="font-headline text-3xl font-bold text-foreground">
                    gatherKids
                </Link>
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold font-headline">Sign In</CardTitle>
                    <CardDescription>
                        Don't have an account?{' '}
                        <Link href="/register" className="underline">Register your family</Link>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>For Prototype Demo</AlertTitle>
                        <AlertDescription>
                            <p>Click one of the following accounts to sign in:</p>
                            <ul className="list-disc pl-5 text-sm mt-2">
                                <li>Admin: <button className="text-left font-semibold underline" onClick={() => prefillDemoCredentials('admin')}>{DEMO_USERS.admin.email}</button></li>
                                <li>Leader: <button className="text-left font-semibold underline" onClick={() => prefillDemoCredentials('leader')}>{DEMO_USERS.leader.email}</button></li>
                                <li>Password: <code className="font-semibold">password</code></li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" onClick={handleLogin}>
                        Sign In
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
