include("PrintStatus.js")
include("CalGeneral.js")

cs_clamp_hold = 3000;
cs_clamp_pause = 10000;
cs_plot_pos = 0;

cs_t_remote1 = [];
cs_power1 = [];
cs_t_remote2 = [];
cs_power2 = [];
cs_t_remote_ext = [];
cs_t_power_ext = [];
cs_time = [];

function CS_ClampFunc(Force, Index)
{
	dev.w(70, Force);
	
	// start clamping
	print("#" + (Index + 1) + " Clamp - up");
	dev.c(102);
	do
	{
		if (anykey() || (dev.r(96) == 4)) return 0;
		sleep(100);
	}
	while (dev.r(96) != 8);
	
	// print force
	print("#" + (Index + 1) + " Force " + (dev.r(110) / 10));
	
	// pause
	sleep(cs_clamp_hold);
	
	// release
	print("#" + (Index + 1) + " Clamp - down");
	dev.c(104);
	do
	{
		if (anykey() || (dev.r(96) == 4)) return 0;
		sleep(100);
	}
	while (dev.r(96) != 3);
	
	return 1;
}

function CS_ClampA(ForceArray, ClampPause)
{
	if (ForceArray.length == 0) return;
	
	// start clamping
	print("# Clamp - up");
	dev.w(70, ForceArray[0]);
	dev.c(102);
	do
	{
		if (anykey()) return;
		sleep(100);
	}
	while (dev.r(96) != 8);
	print("Force: " + (dev.r(110) / 10));
	
	// pause
	print("Pause..");
	sleep(ClampPause);
	
	for (var i = 1; i < ForceArray.length; i++)
	{
		// update
		print("# Clamp - update");
		dev.w(70, ForceArray[i]);
		dev.c(103);
		do
		{
			if (anykey()) return;
			sleep(100);
		}
		while (dev.r(96) != 8);	
		print("Force: " + (dev.r(110) / 10));

		// pause
		print("Pause..");
		sleep(ClampPause);
	}
	
	// release
	print("# Clamp - down");
	dev.c(104);
	do
	{
		if (anykey()) return;
		sleep(100);
	}
	while (dev.r(96) != 3);
}

function CS_CollectTimeFunc()
{
	// get time
	var d = new Date();
	var t_stamp = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
	
	print("#" + (cs_time.length + 1));
	print("Time,    sec: " + t_stamp);
	cs_time.push(t_stamp);
}

function CS_CollectTempFunc()
{
	var t_remote1, t_remote2;
	
	t_remote1 = (dev.r(101) / 10).toFixed(1);
	t_remote2 = (dev.r(102) / 10).toFixed(1);
	
	print("Tremote1,  C: " + t_remote1);
	print("Tremote2,  C: " + t_remote2);
	
	cs_t_remote1[cs_time.length] = t_remote1;
	cs_t_remote2[cs_time.length] = t_remote2;
}

function CS_CollectTempExtFunc(Address)
{
	var t_remote_ext;
	
	dev.w(84, Address);
	dev.c(115);
	t_remote_ext = (dev.r(103) / 10).toFixed(1);
	
	print("TremoteExt,C: " + t_remote_ext);
	cs_t_remote_ext[cs_time.length] = t_remote_ext;
	
	return t_remote_ext;
}

function CS_CollectPowerFunc()
{
	var t_power1, t_power2;
	
	// channel 1
	dev.w(84, 1);
	dev.c(116);
	t_power1 = dev.r(103) / 10;
	
	// channel 2
	dev.w(84, 2);
	dev.c(116);
	t_power2 = dev.r(103) / 10;
	
	print("Power1,    %: " + t_power1.toFixed(1));
	print("Power2,    %: " + t_power2.toFixed(1));
	
	cs_power1[cs_time.length] = t_power1;
	cs_power2[cs_time.length] = t_power2;
}

function CS_Pos(Num, Pos)
{
	for (var i = 0; i < Num; i++)
	{
		print("#" + (i + 1) + " up");
		
		dev.w(64, Pos);
		dev.c(101);
		while (dev.r(96) != 3)
		{
			if (anykey() || (dev.r(96) == 4)) return 0;
			sleep(100);
		}
		sleep(1000);

		print("#" + (i + 1) + " down");
		dev.w(64, 0);
		dev.c(101);
		while (dev.r(96) != 3)
		{
			if (anykey() || (dev.r(96) == 4)) return 0;
			sleep(100);
		}
		sleep(2000);
		
		if (anykey()) return 0;
	}
	
	return 1;
}

function CS_Clamp(Num, Force)
{
	for (var i = 0; i < Num; i++)
	{
		if (!CS_ClampFunc(Force, i)) return 0;
		if (i + 1 < Num) sleep(cs_clamp_pause);
		if (anykey()) return 0;
	}
	
	return 1;
}

function CS_Temp(Sleep)
{
	//---------------------------------------
	print("Reset calibration coefficients? (press 'y' or 'n')");
	var key;
	do
	{
		key = readkey();
	}
	while (key != "y" && key != "n");
	if (key == "y")	
	{
		CCS_TempReadCal1(0, 1, 0);
		CCS_TempReadCal2(0, 1, 0);
		print("Coefficients were reseted.");
		print("-----");
	}
	else
	{
		print("Coefficients were NOT reseted.");
		print("-----");
	}
	//---------------------------------------
	
	//---------------------------------------
	print("Reset data arrays? (press 'y' or 'n')");
	var key;
	do
	{
		key = readkey();
	}
	while (key != "y" && key != "n");
	if (key == "y")	
	{
		CS_ResetA();
		print("Data arrays were reseted.");
		print("-----");
	}
	else
	{
		print("Data arrays were NOT reseted.");
		print("-----");
	}
	//---------------------------------------
		
	while(!anykey())
	{
		CS_CollectTempFunc();
		CS_CollectTempExtFunc(3);
		CS_CollectPowerFunc();
		CS_CollectTimeFunc();
		print("-----");
		
		sleep(Sleep);
	}
}

function CS_ClampAndTemp(Num, Force)
{
	for (var i = 0; i < Num; i++)
	{
		CS_ClampFunc(Force, i);
		CS_CollectTempFunc();
		CS_CollectPowerFunc();
		CS_CollectTimeFunc();
		print("-----");
		
		// pause
		if (i + 1 < Num) sleep(cs_clamp_sleep);
		if (anykey()) return;
	}
}

function CS_BoardReset()
{
	dev.c(320);		// Reset to bootloader
	sleep(500);
	dev.c(312);		// Clear bootloader flag
	sleep(100);
	dev.c(313);		// Reset
}

function CS_ResetA()
{
	cs_t_remote1 = [];
	cs_power1 = [];
	cs_t_remote2 = [];
	cs_power2 = [];
	cs_t_remote_ext = [];
	cs_t_power_ext = [];
	cs_time = [];
}

function CS_Plot()
{
	var i;
	var c = [];
	var ap = [];
	
	af = dev.raf(1);
	df = dev.raf(2);
	e = dev.rafs(3);
	
	
	for (i = 0; i < af.length; i++)
		af[i] = af[i] * 10;
	
	for (i = 0; i < df.length; i++)
		df[i] = df[i] * 10;
	
	for (i = 0; i < e.length; i++)
		e[i] = e[i] * 10;
	
	if (cs_plot_pos)
	{
		c = dev.rlas(1, 500);
		ap = dev.rlas(2, 500);
		
		plot(c, 50, 0);
		plot(ap, 50, 0);
	}

	plot2(af, df, 50, 0);
	plot(e, 50, 0);

	return {ActForce : af, DesForce : df, Error : e, Control : c, ActPos : ap};
}

function CS_PlotDiag()
{
	var ep4 = [];
	var ep5 = [];
	var ep6 = [];
	var ep7 = [];
	var regs = [];
	
	plot(ep4 = dev.raf(4), 1, 0);		sleep(200);
	plot(ep5 = dev.raf(5), 1, 0);		sleep(200);
	plot(ep6 = dev.rafs(6), 1, 0);		sleep(200);
	plot(ep7 = dev.raf(7), 1, 0);
	
	save("diag_ep4.txt", ep4);
	save("diag_ep5.txt", ep5);
	save("diag_ep6.txt", ep6);
	save("diag_ep7.txt", ep7);
	
	dev.Dump("diag_regs1.txt", 70, 72);
	dev.Dump("diag_regs2.txt", 96, 100);
}

function CS_GetCurrent(ForceArray)
{
	var Current = [];
	var ActForce = [];
	
	for (var i = 0; i < ForceArray.length; i++)
	{
		// start clamping
		dev.w(70, ForceArray[i]);
		print("Force setup,  kN: " + (ForceArray[i] / 10));
		
		print("Clamping..");
		dev.c(102);
		do
		{
			if (anykey()) return;
			sleep(100);
		}
		while (dev.r(96) != 8);
		
		// pause
		sleep(5000);
		
		// read current
		dev.w(81, 0x5FC9);
		dev.w(82, 0);
		dev.c(109);
		Current.push(dev.r(112) / 100);
		// read actual force
		ActForce.push(dev.r(110) / 10);
		
		// release
		print("Release..");
		dev.c(104);
		do
		{
			if (anykey()) return;
			sleep(100);
		}
		while (dev.r(96) != 3);
		
		print("Current,      A : " + Current[i]);
		print("Actual force, kN: " + ActForce[i]);
		print("--- " + (i + 1) + " of " + ForceArray.length + " ---");
		
		// pause
		sleep(2000);
		
		if (anykey()) return;
	}
	
	return {Current : Current, ActForce : ActForce};
}

function CS_CollectTempDebug(Pause)
{
	var t_remote1, t_remote2;
	
	while (!anykey())
	{
		dev.w(82, 1);
		dev.c(113);
		t_remote1 = dev.rs(114) / 10;
		
		dev.w(82, 2);
		dev.c(113);
		t_remote2 = dev.rs(114) / 10;
		
		// get time
		var d = new Date();
		var t_stamp = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
		
		print("#" + (cs_time.length + 1));
		print("Tremote1,  C: " + t_remote1);
		print("Tremote2,  C: " + t_remote2);
		print("Time,    sec: " + t_stamp);
		print("----");
		
		cs_t_remote1[cs_time.length] = t_remote1;
		cs_t_remote2[cs_time.length] = t_remote2;
		cs_time.push(t_stamp);
		
		sleep(Pause);
	}
}

function CS_CollectTempDebug2(Pause)
{
	var t_remote1, t_remote2;
	
	while (!anykey())
	{
		t_remote1 = dev.r(101) / 10;
		t_remote2 = dev.r(102) / 10;
		
		// get time
		var d = new Date();
		var t_stamp = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
		
		print("#" + (cs_time.length + 1));
		print("Tremote1,  C: " + t_remote1);
		print("Tremote2,  C: " + t_remote2);
		print("Time,    sec: " + t_stamp);
		print("----");
		
		cs_t_remote1[cs_time.length] = t_remote1;
		cs_t_remote2[cs_time.length] = t_remote2;
		cs_time.push(t_stamp);
		
		sleep(Pause);
	}
}

function CS_LenzeReadReg(Index, SubCode)
{
	dev.w(80, Index);
	dev.w(81, SubCode);
	dev.c(110);
	print(dev.r(112) | (dev.r(113) << 16));
}

function CS_LenzeWriteReg(Index, SubCode, Data)
{
	dev.w(80, Index);
	dev.w(81, SubCode);
	dev.w(86, Data & 0xFFFF);
	dev.w(87, (Data >> 16) & 0xFFFF);
	dev.c(121);
}

function CS_ClampResource(Counter, MaxForce)
{
	var Index;
	
	for (Index = 0; Index < Counter; Index++)
	{
		print("-----------------");
		dev.w(70, 50);
		
		// start clamping
		print("#" + (Index + 1) + " Clamp - up");
		dev.c(102);
		do
		{
			if (anykey() || (dev.r(96) == 4)) return 0;
			sleep(100);
		}
		while (dev.r(96) != 8);
		// print force
		print("#" + (Index + 1) + " Force " + (dev.r(110) / 10));
		
		// pause
		sleep(CGEN_GetRandomInt(1000, 5000));
		
		// update
		var targetF = CGEN_GetRandomInt(50, MaxForce);
		dev.w(70, targetF);
		print("#" + (Index + 1) + " Clamp target force, N: " + (targetF / 10));
		print("#" + (Index + 1) + " Clamp - update");
		dev.c(103);
		do
		{
			if (anykey() || (dev.r(96) == 4)) return 0;
			sleep(100);
		}
		while (dev.r(96) != 8);	
		// print force
		print("#" + (Index + 1) + " Force " + (dev.r(110) / 10));
		
		// pause
		sleep(CGEN_GetRandomInt(1000, 5000));
		
		// update
		dev.w(70, 50)
		print("#" + (Index + 1) + " Clamp - update");
		dev.c(103);
		do
		{
			if (anykey() || (dev.r(96) == 4)) return 0;
			sleep(100);
		}
		while (dev.r(96) != 8);	
		// print force
		print("#" + (Index + 1) + " Force " + (dev.r(110) / 10));
		
		// pause
		sleep(CGEN_GetRandomInt(1000, 5000));
		
		// release
		print("#" + (Index + 1) + " Clamp - down");
		dev.c(104);
		do
		{
			if (anykey() || (dev.r(96) == 4)) return 0;
			sleep(100);
		}
		while (dev.r(96) != 3);
		
		sleep(1000);
	}
	
	return 1;
}
