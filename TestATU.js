include("PrintStatus.js")

atu_hp			= 1;	// 0 - ATU; 1 - ATU HP;
atu_print		= 1;	// Enable printed output

// Status check
function _ATU_Active()
{
	if (dev.r(96) == 4 || dev.r(96) == 1)
		return 0;
	else
		return 1;
}

// Single pulse measurement 
function ATU_Pulse(PreCurrent, Current)
{
	dev.w(66, Math.round(Current / 2));
	dev.w(64, PreCurrent);
	dev.c(atu_hp ? 76 : 105);
	while (_ATU_Active()) { sleep(100); };
	
	return ATU_GetResult();
}

// Single measurement by power
function ATU_StartPower(PreCurrent, Power)
{
	dev.w(65, Power / (atu_hp ? 10 : 1));
	dev.w(64, PreCurrent);
	dev.c(100);
	while (_ATU_Active()) { sleep(100); };
	
	ATU_PrintWarning();
	return ATU_GetResult();
}

// Print values (Ubr, Uprsm, Iprsm, Prsm)
function ATU_GetResult()
{
	var Vbr = dev.r(109);
	var V = dev.r(110);
	var I = dev.r(111);
	var P = dev.r(112) * (atu_hp ? 10 : 1);
	
	if (atu_print)
	{
		print("Ubr,	 V: " + Vbr);
		print("U(Prsm), V: " + V);
		print("I(Prsm), A: " + (I / 1000).toFixed(2));
		print("Prsm,   kW: " + (P / 1000).toFixed(2));
		print("---------")
	}
	
	return {Vbr:Vbr, V:V, I:I, P:P}
}

// Print capacitors voltage
function ATU_PrintV()
{
	if (atu_hp)
	{
		dev.c(72);
		print("Cell voltage 1 [V]: " + (dev.r(103) / 10));
		print("Cell voltage 2 [V]: " + (dev.r(104) / 10));
	}
	else
		print("Cell voltage [V]: " + (dev.r(104) / 10));
}

// Plot graphs
function ATU_Plot()
{
	var current = dev.raf(2);
	for (var i = 0; i < current.length; ++i)
		current[i] /= 1000;
	
	plot(dev.raf(1), 1, 0); sleep(200);
	plot(current, 1, 0); sleep(200);
	plot(dev.raf(3), 1, 0);
}

// Plot diag graphs
function ATU_PlotDiag()
{
	plot(dev.raf(4), 1, 0); sleep(200);
	plot(dev.raf(5), 1, 0); sleep(200);
	plot(dev.raf(6), 1, 0); sleep(200);
	plot(dev.raf(7), 1, 0);
}

// Read, decode and print warning
function ATU_PrintWarning()
{
	var warning = dev.r(99);
	
	if (warning)
	{
		var msg = "";
		switch (warning)
		{
			case 1:
				msg = "Idle";
				break;
			case 2:
				msg = "Short";
				break;
			case 3:
				msg = "High power error";
				break;
			case 4:
				msg = "DUT break";
				break;
			case 5:
				msg = "Facet break";
				break;
		}
		
		print("Warning: " + msg);
	}
}

// Resource test by power
function ATU_ResourseTest(PreCurrent, Power, Num, Sleep)
{
	var csv_array = [];
	var count_pulse = 0;

	catu_v = [];
	catu_i = [];
	catu_p = [];
	catu_p_set = [];

	v_sc = [];
	i_sc = [];
	p_sc = [];

	csv_array.push("catu_v; v_sc; catu_i; i_sc; catu_p_set; catu_p; p_sc");

	for (var i = 0; i < Num; i++)
	{
		print("#" + (i + 1));
		ATU_StartPower(PreCurrent, Power);

		catu_v[i] = dev.r(110);
		catu_i[i] = dev.r(111);
		catu_p[i] = dev.r(112) * (atu_hp ? 10 : 1);
		catu_p_set[i] = dev.r(65) * 10;

		v_sc[i] = CATU_MeasureV();
		i_sc[i] = CATU_MeasureI();
		p_sc[i] = Math.round(v_sc[i] * i_sc[i] / 1000);

		v_sc[i] = 0;
		i_sc[i] = 0;
		p_sc[i] = 0;

		count_pulse = dev.r(105);

		if (anykey()) return;
		sleep(Sleep);
		if (anykey()) return;
		csv_array.push(catu_v[i] + ";" + v_sc[i] + ";" + catu_i[i] + ";" + i_sc[i] + ";" + catu_p_set[i] + ";" + catu_p[i] + ";" + p_sc[i] + ";" + count_pulse);
	}
	save("data/ATUResourceTest.csv", csv_array);
}